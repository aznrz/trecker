// trecker — API + аутентификация + раздача статики
// Маршруты /api/* обрабатывает воркер, остальное отдаёт ASSETS (public/).

const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: e.message || "server error" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendScheduledNotifications(env, event.cron));
  },
};

// ---------- роутер ----------

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/^\/api/, "");
  const method = request.method;

  // публичная конфигурация для фронтенда (включены ли Google / Turnstile / Push)
  if (path === "/config" && method === "GET") {
    return json({
      turnstileSiteKey: env.TURNSTILE_SITEKEY || null,
      googleEnabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      vapidPublicKey: env.VAPID_PUBLIC_KEY || null,
    });
  }

  // Google OAuth (полностраничные GET-редиректы)
  if (path === "/auth/google" && method === "GET") return googleStart(env, url);
  if (path === "/auth/google/callback" && method === "GET") return googleCallback(request, env, url);

  if (path === "/register" && method === "POST") {
    if (!(await rateOk(env, "auth", request, 8, 60))) return json({ error: "Слишком много попыток, попробуйте через минуту" }, 429);
    return register(request, env);
  }
  if (path === "/login" && method === "POST") {
    if (!(await rateOk(env, "auth", request, 8, 60))) return json({ error: "Слишком много попыток, попробуйте через минуту" }, 429);
    return login(request, env);
  }
  if (path === "/logout" && method === "POST") return logout(request);

  // Health ingest: Bearer-токен (без сессии, для Tasker и т.п.)
  if (path === "/ingest" && method === "POST") return ingestHealth(request, env);

  // дальше — только для авторизованных
  const uid = await currentUid(request, env);
  if (!uid) return json({ error: "unauthorized" }, 401);

  if (path === "/me" && method === "GET") {
    const u = await env.DB.prepare("SELECT id, email FROM users WHERE id=?").bind(uid).first();
    return json({ user: u });
  }
  if (path === "/activities" && method === "GET") return listActivities(env, uid);
  if (path === "/activities" && method === "POST") return createActivity(request, env, uid);

  const actMatch = path.match(/^\/activities\/(\d+)$/);
  if (actMatch) {
    const id = +actMatch[1];
    if (method === "PATCH") return updateActivity(request, env, uid, id);
    if (method === "DELETE") return deleteActivity(env, uid, id);
  }

  const actLogsMatch = path.match(/^\/activities\/(\d+)\/logs$/);
  if (actLogsMatch && method === "GET") return getActivityLogs(env, uid, +actLogsMatch[1]);


  if (path === "/logs" && method === "POST") {
    if (!(await rateOk(env, "api", request, 120, 60))) return json({ error: "Слишком часто, подождите немного" }, 429);
    return createLog(request, env, uid);
  }
  if (path === "/logs/clear" && method === "POST") return clearDay(request, env, uid);
  const logMatch = path.match(/^\/logs\/(\d+)$/);
  if (logMatch) {
    const id = +logMatch[1];
    if (method === "DELETE") return deleteLog(env, uid, id);
    if (method === "PATCH") return updateLog(request, env, uid, id);
  }

  if (path === "/stats" && method === "GET") return stats(env, uid, url);

  // Gym Mode: сохранение тренировки и агрегированная аналитика
  if (path === "/workouts" && method === "POST") {
    if (!(await rateOk(env, "api", request, 120, 60))) return json({ error: "Слишком часто, подождите немного" }, 429);
    return saveWorkout(request, env, uid);
  }
  if (path === "/workouts/stats" && method === "GET") return workoutStats(env, uid, url);

  if (path === "/push/subscribe" && method === "POST") return subscribePush(request, env, uid);
  if (path === "/push/subscribe" && method === "DELETE") return unsubscribePush(request, env, uid);

  if (path === "/tokens" && method === "GET") return getApiToken(env, uid);
  if (path === "/tokens" && method === "POST") return generateApiToken(env, uid);

  return json({ error: "not found" }, 404);
}

// ---------- auth: эндпоинты ----------

async function register(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = (b.email || "").toLowerCase().trim();
  const password = b.password || "";
  if (!(await verifyTurnstile(env, request, b.turnstile))) return json({ error: "Проверка безопасности не пройдена, обновите страницу" }, 400);
  if (!validEmail(email)) return json({ error: "Некорректный email" }, 400);
  if (password.length < 6) return json({ error: "Пароль минимум 6 символов" }, 400);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (existing) return json({ error: "Такой email уже зарегистрирован" }, 409);

  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    "INSERT INTO users (email, pass_hash, created_at) VALUES (?,?,?)"
  ).bind(email, hash, now).run();
  const uid = res.meta.last_row_id;

  await seedDefaultActivities(env, uid);
  return sessionResponse(uid, env, { user: { id: uid, email } }, request);
}

async function login(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = (b.email || "").toLowerCase().trim();
  if (!(await verifyTurnstile(env, request, b.turnstile))) return json({ error: "Проверка безопасности не пройдена, обновите страницу" }, 400);
  const u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
  if (!u || !(await verifyPassword(b.password || "", u.pass_hash))) {
    return json({ error: "Неверный email или пароль" }, 401);
  }
  return sessionResponse(u.id, env, { user: { id: u.id, email: u.email } }, request);
}

function logout(request) {
  const isLocal = request ? new URL(request.url).hostname.match(/^(localhost|127\.0\.0\.1)$/) : false;
  const secureFlag = isLocal ? "" : "; Secure";
  return json({ ok: true }, 200, {
    "Set-Cookie": `sid=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`,
  });
}

// ---------- защита: rate limit + Turnstile ----------

// Лимитер запросов на D1 (надёжно на любом плане): окно фиксированной длины по IP.
async function rateOk(env, name, request, limit, periodSec) {
  const ip = request.headers.get("CF-Connecting-IP") || "anon";
  const now = Math.floor(Date.now() / 1000);
  const win = now - (now % periodSec);
  const key = `${name}:${ip}`;
  try {
    // Атомарно: инкремент + возврат нового значения одним запросом (без stale-чтения с реплики)
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (k, cnt, win) VALUES (?1, 1, ?2)
       ON CONFLICT(k) DO UPDATE SET
         cnt = CASE WHEN win = ?2 THEN cnt + 1 ELSE 1 END,
         win = ?2
       RETURNING cnt`
    ).bind(key, win).first();
    return !row || row.cnt <= limit;
  } catch {
    return true; // не блокируем пользователей при сбое лимитера
  }
}

// Проверка токена Cloudflare Turnstile. Если секрет не задан — фича выключена.
async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new URLSearchParams();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = await r.json().catch(() => ({}));
    return !!data.success;
  } catch {
    return false;
  }
}

// ---------- Google OAuth ----------

function googleRedirectUri(url) {
  return `${url.origin}/api/auth/google/callback`;
}

function googleStart(env, url) {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google-вход не настроен" }, 503);
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(url),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const secureFlag = isLocalHost(url.hostname) ? "" : "; Secure";
  const headers = new Headers({ Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  headers.append("Set-Cookie", `gstate=${state}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=600`);
  return new Response(null, { status: 302, headers });
}

async function googleCallback(request, env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(request, "gstate");
  if (!code || !state || !cookieState || !timingSafeEqual(state, cookieState)) {
    return redirectHome(url, "google");
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: googleRedirectUri(url),
        grant_type: "authorization_code",
      }),
    });
    const tok = await tokenRes.json().catch(() => ({}));
    if (!tok.access_token) return redirectHome(url, "google");
    const uiRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const profile = await uiRes.json().catch(() => ({}));
    const email = (profile.email || "").toLowerCase().trim();
    if (!email || profile.email_verified === false) return redirectHome(url, "google");

    const uid = await upsertGoogleUser(env, email, profile.sub);
    const sid = await createSession(uid, secret(env));
    const secureFlag = isLocalHost(url.hostname) ? "" : "; Secure";
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", `sid=${sid}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`);
    headers.append("Set-Cookie", `gstate=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`);
    return new Response(null, { status: 302, headers });
  } catch {
    return redirectHome(url, "google");
  }
}

async function upsertGoogleUser(env, email, googleId) {
  const now = new Date().toISOString();
  const u = await env.DB.prepare("SELECT id FROM users WHERE google_id=? OR email=?").bind(googleId, email).first();
  if (u) {
    await env.DB.prepare("UPDATE users SET google_id=? WHERE id=? AND (google_id IS NULL OR google_id='')").bind(googleId, u.id).run();
    return u.id;
  }
  // Google-аккаунты без пароля: ставим нерабочий sentinel (verifyPassword вернёт false)
  const res = await env.DB.prepare(
    "INSERT INTO users (email, pass_hash, google_id, created_at) VALUES (?,?,?,?)"
  ).bind(email, "google-oauth", googleId, now).run();
  const uid = res.meta.last_row_id;
  await seedDefaultActivities(env, uid);
  return uid;
}

function redirectHome(url, errCode) {
  return new Response(null, { status: 302, headers: { Location: `/?auth_error=${errCode}` } });
}

function isLocalHost(hostname) {
  return /^(localhost|127\.0\.0\.1)$/.test(hostname || "");
}

async function seedDefaultActivities(env, uid) {
  const now = new Date().toISOString();
  // [name, unit, color, goal, type, qa1, qa2, qa3, sort]
  const defaults = [
    ["Подтягивания", "повторы", "#0059b5", 50, "numeric", 5, 15, 25, 0],
    ["Чтение", "страниц", "#006e1c", 20, "numeric", 5, 10, 25, 1],
    ["Медитация", "", "#8c21c0", 1, "simple", null, null, null, 2],
  ];
  for (const [name, unit, color, goal, type, qa1, qa2, qa3, sort] of defaults) {
    await env.DB.prepare(
      "INSERT INTO activities (user_id, name, unit, color, daily_goal, type, quick_add_1, quick_add_2, quick_add_3, sort, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(uid, name, unit, color, goal, type, qa1, qa2, qa3, sort, now).run();
  }
}

// ---------- activities ----------

// Положительное число или null (для значений кнопок быстрого ввода)
function posOrNull(v) {
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

// Нормализация полей привычки из тела запроса (тип + кнопки + цель)
function normActivity(b) {
  const type = b.type === "simple" ? "simple" : "numeric";
  if (type === "simple") {
    // разовая: цель всегда 1, единиц и кнопок нет
    return { type, unit: "", goal: 1, qa1: null, qa2: null, qa3: null };
  }
  return {
    type,
    unit: (b.unit || "").trim(),
    goal: Number(b.daily_goal) || 0,
    qa1: posOrNull(b.quick_add_1),
    qa2: posOrNull(b.quick_add_2),
    qa3: posOrNull(b.quick_add_3),
  };
}

async function listActivities(env, uid) {
  const r = await env.DB.prepare(
    "SELECT * FROM activities WHERE user_id=? ORDER BY sort, id"
  ).bind(uid).all();
  return json({ activities: r.results });
}

async function createActivity(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  const name = (b.name || "").trim();
  if (!name) return json({ error: "Нужно название" }, 400);
  const f = normActivity(b);
  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    "INSERT INTO activities (user_id, name, unit, color, daily_goal, type, quick_add_1, quick_add_2, quick_add_3, sort, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(uid, name, f.unit, b.color || "#0059b5", f.goal, f.type, f.qa1, f.qa2, f.qa3, Number(b.sort) || 0, now).run();
  return json({ id: res.meta.last_row_id });
}

async function updateActivity(request, env, uid, id) {
  const b = await request.json().catch(() => ({}));
  const owned = await env.DB.prepare("SELECT id FROM activities WHERE id=? AND user_id=?").bind(id, uid).first();
  if (!owned) return json({ error: "not found" }, 404);
  const name = (b.name || "").trim();
  if (!name) return json({ error: "Нужно название" }, 400);
  const f = normActivity(b);
  await env.DB.prepare(
    "UPDATE activities SET name=?, unit=?, color=?, daily_goal=?, type=?, quick_add_1=?, quick_add_2=?, quick_add_3=? WHERE id=? AND user_id=?"
  ).bind(name, f.unit, b.color || "#0059b5", f.goal, f.type, f.qa1, f.qa2, f.qa3, id, uid).run();
  return json({ ok: true });
}

async function deleteActivity(env, uid, id) {
  await env.DB.prepare("DELETE FROM logs WHERE activity_id=? AND user_id=?").bind(id, uid).run();
  await env.DB.prepare("DELETE FROM activities WHERE id=? AND user_id=?").bind(id, uid).run();
  return json({ ok: true });
}

async function getActivityLogs(env, uid, activityId) {
  const r = await env.DB.prepare(
    "SELECT id, amount, day, logged_at FROM logs WHERE user_id=? AND activity_id=? ORDER BY logged_at DESC LIMIT 50"
  ).bind(uid, activityId).all();
  return json({ logs: r.results });
}

// ---------- logs ----------

async function createLog(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  let amount = Number(b.amount);
  if (!b.activity_id || !isFinite(amount) || amount === 0) return json({ error: "invalid" }, 400);
  const act = await env.DB.prepare("SELECT id, type FROM activities WHERE id=? AND user_id=?").bind(b.activity_id, uid).first();
  if (!act) return json({ error: "no activity" }, 404);
  const day = isValidDay(b.day) ? b.day : new Date().toISOString().slice(0, 10);
  // Деградация legacy: type NULL/иное трактуем как 'numeric'; 'simple' — разовая
  const isSimple = act.type === "simple";
  if (isSimple) {
    amount = 1; // разовая привычка всегда логируется как 1
    // Идемпотентность: не больше одной записи за локальный день
    const existing = await env.DB.prepare(
      "SELECT id FROM logs WHERE user_id=? AND activity_id=? AND day=? LIMIT 1"
    ).bind(uid, b.activity_id, day).first();
    if (existing) return json({ ok: true, already: true });
  }
  const logged_at = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO logs (user_id, activity_id, amount, day, logged_at) VALUES (?,?,?,?,?)"
  ).bind(uid, b.activity_id, amount, day, logged_at).run();
  return json({ ok: true });
}

// Сброс всех записей привычки за конкретный день (отмена/исправление)
async function clearDay(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  if (!b.activity_id) return json({ error: "invalid" }, 400);
  const day = isValidDay(b.day) ? b.day : new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    "DELETE FROM logs WHERE user_id=? AND activity_id=? AND day=?"
  ).bind(uid, b.activity_id, day).run();
  return json({ ok: true });
}

async function updateLog(request, env, uid, id) {
  const b = await request.json().catch(() => ({}));
  const amount = Number(b.amount);
  if (!isFinite(amount) || amount <= 0) return json({ error: "invalid amount" }, 400);
  const owned = await env.DB.prepare("SELECT id FROM logs WHERE id=? AND user_id=?").bind(id, uid).first();
  if (!owned) return json({ error: "not found" }, 404);
  await env.DB.prepare("UPDATE logs SET amount=? WHERE id=? AND user_id=?").bind(amount, id, uid).run();
  return json({ ok: true });
}

async function deleteLog(env, uid, id) {
  await env.DB.prepare("DELETE FROM logs WHERE id=? AND user_id=?").bind(id, uid).run();
  return json({ ok: true });
}

// ---------- stats ----------

async function stats(env, uid, url) {
  const today = isValidDay(url.searchParams.get("today")) ? url.searchParams.get("today") : new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30") || 30, 1), 90);
  const acts = (await env.DB.prepare("SELECT * FROM activities WHERE user_id=? ORDER BY sort, id").bind(uid).all()).results;

  const fromDay = addDays(today, -(days - 1));
  const sumRows = (await env.DB.prepare(
    "SELECT activity_id, day, SUM(amount) total FROM logs WHERE user_id=? AND day>=? AND day<=? GROUP BY activity_id, day"
  ).bind(uid, fromDay, today).all()).results;
  const dayRows = (await env.DB.prepare(
    "SELECT DISTINCT activity_id, day FROM logs WHERE user_id=? ORDER BY day DESC"
  ).bind(uid).all()).results;

  const daysByAct = {};
  for (const r of dayRows) (daysByAct[r.activity_id] ||= new Set()).add(r.day);
  const sumByActDay = {};
  for (const r of sumRows) (sumByActDay[r.activity_id] ||= {})[r.day] = r.total;

  const activities = acts.map((a) => {
    const set = daysByAct[a.id] || new Set();
    let streak = 0;
    let cursor = set.has(today) ? today : addDays(today, -1);
    while (set.has(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      series.push({ day: d, total: (sumByActDay[a.id] && sumByActDay[a.id][d]) || 0 });
    }
    return {
      ...a,
      today_total: (sumByActDay[a.id] && sumByActDay[a.id][today]) || 0,
      streak,
      series,
    };
  });

  return json({ today, days, activities });
}

// ---------- workouts (Gym Mode) ----------

// Сохранение тренировки: upsert упражнений + запись подходов.
async function saveWorkout(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  const day = isValidDay(b.day) ? b.day : new Date().toISOString().slice(0, 10);
  const sets = Array.isArray(b.sets) ? b.sets.slice(0, 100) : [];
  const now = new Date().toISOString();
  let count = 0;
  for (const s of sets) {
    const name = (s && s.exercise ? String(s.exercise) : "").trim();
    const weight = Number(s && s.weight);
    const reps = Math.trunc(Number(s && s.reps));
    if (!name || !isFinite(weight) || weight < 0 || !isFinite(reps) || reps <= 0) continue;
    // upsert упражнения: вернём id независимо от того, было оно или создано
    const ex = await env.DB.prepare(
      "INSERT INTO exercises (user_id, name, created_at) VALUES (?,?,?) ON CONFLICT(user_id, name) DO UPDATE SET name=name RETURNING id"
    ).bind(uid, name, now).first();
    await env.DB.prepare(
      "INSERT INTO workout_sets (user_id, exercise_id, weight, reps, day, logged_at) VALUES (?,?,?,?,?,?)"
    ).bind(uid, ex.id, weight, reps, day, now).run();
    count++;
  }
  if (!count) return json({ error: "Нет валидных подходов" }, 400);
  return json({ ok: true, count });
}

// Агрегированная аналитика: тоннаж за 7/14/30 дней + метрики по упражнениям (all-time).
async function workoutStats(env, uid, url) {
  const today = isValidDay(url.searchParams.get("today")) ? url.searchParams.get("today") : new Date().toISOString().slice(0, 10);
  const from30 = addDays(today, -29);
  const from14 = addDays(today, -13);
  const from7 = addDays(today, -6);

  // Тоннаж (SUM(weight*reps)) по дням за 30 дней → агрегируем в 7/14/30 в JS
  const dayRows = (await env.DB.prepare(
    "SELECT day, SUM(weight*reps) v FROM workout_sets WHERE user_id=? AND day>=? AND day<=? GROUP BY day"
  ).bind(uid, from30, today).all()).results;
  let d7 = 0, d14 = 0, d30 = 0;
  for (const r of dayRows) {
    const v = r.v || 0;
    d30 += v;
    if (r.day >= from14) d14 += v;
    if (r.day >= from7) d7 += v;
  }

  // По упражнениям за всё время: объём, макс. вес, оценка 1RM (Эпли: weight*(1+reps/30))
  const exRows = (await env.DB.prepare(
    `SELECT e.name AS name,
            SUM(w.weight * w.reps) AS volume,
            MAX(w.weight) AS maxWeight,
            MAX(w.weight * (1 + w.reps / 30.0)) AS est1rm,
            COUNT(*) AS sets,
            SUM(w.reps) AS reps
       FROM workout_sets w
       JOIN exercises e ON e.id = w.exercise_id
      WHERE w.user_id = ?
      GROUP BY e.id
      ORDER BY volume DESC`
  ).bind(uid).all()).results;

  return json({
    today,
    tonnage: { d7, d14, d30 },
    exercises: exRows,
    top: exRows.slice(0, 3),
  });
}

// ---------- сессии (подписанная cookie) ----------

function secret(env) {
  const s = env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET не задан (Secret в Cloudflare или .dev.vars)");
  return s;
}

async function currentUid(request, env) {
  const token = getCookie(request, "sid");
  if (!token) return null;
  return verifySession(token, secret(env));
}

async function sessionResponse(uid, env, body, request) {
  const token = await createSession(uid, secret(env));
  const isLocal = request ? new URL(request.url).hostname.match(/^(localhost|127\.0\.0\.1)$/) : false;
  const secureFlag = isLocal ? "" : "; Secure";
  return json(body, 200, {
    "Set-Cookie": `sid=${token}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`,
  });
}

async function createSession(uid, sec) {
  const body = b64url(enc.encode(JSON.stringify({ uid, exp: Date.now() + 30 * 86400000 })));
  const sig = await sign(body, sec);
  return `${body}.${sig}`;
}

async function verifySession(token, sec) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body, sec);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(dec.decode(fromB64url(body)));
    if (!data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

async function sign(data, sec) {
  const key = await crypto.subtle.importKey("raw", enc.encode(sec), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

// ---------- пароли (PBKDF2-SHA256) ----------

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const bits = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(bits)}`;
}

async function verifyPassword(password, stored) {
  const parts = (stored || "").split("$");
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromB64(parts[2]);
  const bits = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(b64(bits), parts[3]);
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

// ---------- утилиты ----------

function json(data, status = 200, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...(extraHeaders || {}) },
  });
}

function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const m = h.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidDay(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function b64(bytes) {
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}
function fromB64(str) {
  const bin = atob(str);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function b64url(bytes) {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  return fromB64(str.replace(/-/g, "+").replace(/_/g, "/"));
}

// ---------- push subscriptions ----------

async function subscribePush(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  const { endpoint, p256dh, auth } = b;
  if (!endpoint || !p256dh || !auth) return json({ error: "invalid subscription" }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?,?,?,?,?)
     ON CONFLICT(user_id, endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth`
  ).bind(uid, endpoint, p256dh, auth, now).run();
  return json({ ok: true });
}

async function unsubscribePush(request, env, uid) {
  const b = await request.json().catch(() => ({}));
  const { endpoint } = b;
  if (!endpoint) return json({ error: "invalid" }, 400);
  await env.DB.prepare(
    "DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?"
  ).bind(uid, endpoint).run();
  return json({ ok: true });
}

// ---------- scheduled: cron → push notifications ----------

async function sendScheduledNotifications(env, cron) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

  // Almaty UTC+5, no DST
  const now = new Date();
  const almatyMs = now.getTime() + 5 * 3600 * 1000;
  const today = new Date(almatyMs).toISOString().slice(0, 10);

  // Determine message by cron slot
  const MSGS = {
    "0 3 * * *":  { title: "🌅 Герой, доброе утро!", body: "Начни день — отметь первые привычки!" },
    "0 8 * * *":  { title: "💪 Герой, время обеда!", body: "Привычки сами себя не отметят 😄" },
    "0 15 * * *": { title: "🌙 Герой, добрый вечер!", body: "Последний шанс закрыть день на 100%!" },
  };
  const msg = MSGS[cron] || { title: "Habit Tracker", body: "Не забудь отметить привычки!" };

  // Find subscriptions for users who have at least one incomplete habit today:
  //   simple  → not logged at all
  //   numeric → today_total < daily_goal (only when goal > 0)
  const { results } = await env.DB.prepare(`
    SELECT DISTINCT ps.id, ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    WHERE EXISTS (
      SELECT 1 FROM activities a
      LEFT JOIN (
        SELECT activity_id, SUM(amount) AS total
        FROM logs WHERE day = ?
        GROUP BY activity_id
      ) dl ON dl.activity_id = a.id
      WHERE a.user_id = ps.user_id
        AND (
          (a.type = 'simple' AND dl.total IS NULL)
          OR (a.type != 'simple' AND a.daily_goal > 0
              AND COALESCE(dl.total, 0) < a.daily_goal)
        )
    )
  `).bind(today).all();

  for (const sub of results) {
    try {
      const status = await sendPushNotification(env, sub, msg);
      if (status === 410 || status === 404) {
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE id=?").bind(sub.id).run();
      }
    } catch (e) {
      console.error("push failed sub=" + sub.id, e?.message);
    }
  }
}

// ---------- Web Push: VAPID JWT + RFC 8291 encryption ----------

function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

async function importVapidKey(env) {
  // VAPID_PUBLIC_KEY: base64url of 65-byte uncompressed P-256 point
  // VAPID_PRIVATE_KEY: base64url of 32-byte scalar (d)
  const pub = fromB64url(env.VAPID_PUBLIC_KEY);
  const jwk = {
    kty: "EC", crv: "P-256",
    d: env.VAPID_PRIVATE_KEY,
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function createVapidJWT(env, endpoint) {
  const origin = new URL(endpoint);
  const aud = `${origin.protocol}//${origin.host}`;
  const exp = Math.floor(Date.now() / 1000) + 43200;
  const sub = env.VAPID_EMAIL ? `mailto:${env.VAPID_EMAIL}` : "mailto:admin@example.com";

  const h = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64url(enc.encode(JSON.stringify({ aud, exp, sub })));
  const sigInput = `${h}.${p}`;

  const key = await importVapidKey(env);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(sigInput));
  return `${sigInput}.${b64url(new Uint8Array(sig))}`;
}

async function hmacSHA256(keyBytes, data) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
}

// RFC 8291: encrypt push payload with AES-128-GCM
async function encryptWebPush(p256dhBytes, authBytes, plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Ephemeral server key pair (ECDH)
  const asKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKP.publicKey));

  // Import UA public key and derive ECDH shared secret
  const uaPub = await crypto.subtle.importKey("raw", p256dhBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, asKP.privateKey, 256));

  // IKM derivation (RFC 8291 §3.3)
  const prkAuth = await hmacSHA256(authBytes, ecdhSecret);
  const authInfo = concatBytes(enc.encode("WebPush: info\x00"), p256dhBytes, asPubRaw, new Uint8Array([1]));
  const ikm = await hmacSHA256(prkAuth, authInfo);

  // PRK
  const prk = await hmacSHA256(salt, ikm);

  // CEK (16 bytes) and nonce (12 bytes) via HKDF-Expand T(1)
  const cek = (await hmacSHA256(prk, concatBytes(enc.encode("Content-Encoding: aes128gcm\x00"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmacSHA256(prk, concatBytes(enc.encode("Content-Encoding: nonce\x00"), new Uint8Array([1])))).slice(0, 12);

  // Encrypt with AES-128-GCM; append \x02 padding delimiter
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    concatBytes(enc.encode(plaintext), new Uint8Array([2]))
  ));

  // aes128gcm body: salt(16) | rs(4 BE) | keyid_len(1) | keyid(65) | ciphertext
  const header = new Uint8Array(21 + asPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPubRaw.length;
  header.set(asPubRaw, 21);

  return concatBytes(header, ciphertext);
}

// ---------- API tokens (для Tasker / Health Connect) ----------

async function getApiToken(env, uid) {
  const row = await env.DB.prepare("SELECT token FROM api_tokens WHERE user_id=?").bind(uid).first();
  return json({ token: row ? row.token : null });
}

async function generateApiToken(env, uid) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO api_tokens (user_id, token, created_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token, created_at=excluded.created_at"
  ).bind(uid, token, now).run();
  return json({ token });
}

// ---------- Health ingest ----------

async function ingestHealth(request, env) {
  const auth = (request.headers.get("Authorization") || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return json({ error: "unauthorized" }, 401);

  const row = await env.DB.prepare("SELECT user_id FROM api_tokens WHERE token=?").bind(token).first();
  if (!row) return json({ error: "unauthorized" }, 401);
  const uid = row.user_id;

  const body = await request.json().catch(() => ({}));
  const { steps, weight_kg, date } = body;
  const day = (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
    ? date
    : new Date().toISOString().split("T")[0];

  const synced = [];
  const now = new Date().toISOString();

  if (typeof steps === "number" && steps >= 0 && steps < 200000) {
    const actId = await findOrCreateHealthActivity(env, uid, "steps");
    await env.DB.prepare("DELETE FROM logs WHERE user_id=? AND activity_id=? AND day=?").bind(uid, actId, day).run();
    await env.DB.prepare("INSERT INTO logs (user_id, activity_id, amount, day, logged_at) VALUES (?,?,?,?,?)").bind(uid, actId, steps, day, now).run();
    synced.push("steps");
  }

  if (typeof weight_kg === "number" && weight_kg > 0 && weight_kg < 500) {
    const actId = await findOrCreateHealthActivity(env, uid, "weight");
    await env.DB.prepare("DELETE FROM logs WHERE user_id=? AND activity_id=? AND day=?").bind(uid, actId, day).run();
    await env.DB.prepare("INSERT INTO logs (user_id, activity_id, amount, day, logged_at) VALUES (?,?,?,?,?)").bind(uid, actId, weight_kg, day, now).run();
    synced.push("weight");
  }

  return json({ ok: true, synced });
}

async function findOrCreateHealthActivity(env, uid, type) {
  const isSteps = type === "steps";
  const searchTerms = isSteps ? ["шаг", "step"] : ["вес", "weight", "масс"];
  const defaultName = isSteps ? "👣 Шаги" : "⚖️ Вес";
  const defaultUnit = isSteps ? "шаги" : "кг";
  const defaultGoal = isSteps ? 10000 : 0;
  const defaultColor = isSteps ? "#006e1c" : "#0059b5";

  const acts = await env.DB.prepare("SELECT id, name FROM activities WHERE user_id=?").bind(uid).all();
  for (const act of (acts.results || [])) {
    const n = act.name.toLowerCase();
    if (searchTerms.some(term => n.includes(term))) return act.id;
  }

  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    "INSERT INTO activities (user_id, name, unit, color, daily_goal, type, sort, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(uid, defaultName, defaultUnit, defaultColor, defaultGoal, "numeric", 999, now).run();
  return res.meta.last_row_id;
}

async function sendPushNotification(env, sub, payload) {
  const jwt = await createVapidJWT(env, sub.endpoint);
  const p256dh = fromB64url(sub.p256dh);
  const auth = fromB64url(sub.auth);
  const body = await encryptWebPush(p256dh, auth, JSON.stringify(payload));

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "43200",
    },
    body,
  });
  return res.status;
}
