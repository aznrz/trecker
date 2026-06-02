/**
 * Habit Tracker — трекер привычек (SPA, light/dark темы через CSS-переменные)
 * Архитектура: State → API → Render. Бэкенд и эндпоинты без изменений.
 */

// ==========================================
// 1. STATE
// ==========================================
const state = {
  user: null,
  activities: [],
  activeTab: 'today',
  selectedActivityId: null,
  statsDays: 30,
  statsPeriod: 7,
  statsMode: 'habits', // 'habits' | 'gym' — режим вкладки Stats
  selectedColor: '#0059b5',
  gymSets: [], // подходы текущей тренировки (Gym Mode)
};

// Палитра, читаемая на светлом фоне
const COLOR_PRESETS = [
  '#0059b5', // Blue (primary)
  '#006e1c', // Green
  '#8c21c0', // Purple
  '#ba1a1a', // Red
  '#c2410c', // Orange
  '#0e7490', // Cyan
  '#be185d', // Pink
  '#4338ca', // Indigo
];

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// HTML-экранирование пользовательских данных (защита от XSS в innerHTML-шаблонах)
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getEmoji(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('подтягиван') || lower.includes('pull-up') || lower.includes('спорт')) return '💪';
  if (lower.includes('отжиман') || lower.includes('push-up') || lower.includes('бег')) return '🏃';
  if (lower.includes('чтени') || lower.includes('read') || lower.includes('книг')) return '📖';
  if (lower.includes('математ') || lower.includes('math') || lower.includes('расчет')) return '🧮';
  if (lower.includes('pl-300') || lower.includes('study') || lower.includes('изуч') || lower.includes('учеб')) return '📚';
  return '✨';
}

// ==========================================
// 2. API CLIENT
// ==========================================
async function fetchJson(url, options = {}) {
  options.credentials = 'same-origin';
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      const hadUser = !!state.user;
      state.user = null;
      renderAuth();
      if (hadUser) showToast('Session expired, please sign in again', 'error');
      throw new Error('Authentication required');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

const api = {
  getMe: () => fetchJson('/api/me'),
  getConfig: () => fetchJson('/api/config'),
  login: (email, password, turnstile) => fetchJson('/api/login', { method: 'POST', body: JSON.stringify({ email, password, turnstile }) }),
  register: (email, password, turnstile) => fetchJson('/api/register', { method: 'POST', body: JSON.stringify({ email, password, turnstile }) }),
  logout: () => fetchJson('/api/logout', { method: 'POST' }),
  getActivities: () => fetchJson('/api/activities'),
  createActivity: (data) =>
    fetchJson('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id, data) =>
    fetchJson(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteActivity: (id) => fetchJson(`/api/activities/${id}`, { method: 'DELETE' }),
  addLog: (activityId, amount, day) =>
    fetchJson('/api/logs', { method: 'POST', body: JSON.stringify({ activity_id: activityId, amount, day }) }),
  clearDay: (activityId, day) =>
    fetchJson('/api/logs/clear', { method: 'POST', body: JSON.stringify({ activity_id: activityId, day }) }),
  getStats: (day, days) => fetchJson(`/api/stats?today=${day}&days=${days}`),
  saveWorkout: (day, sets) => fetchJson('/api/workouts', { method: 'POST', body: JSON.stringify({ day, sets }) }),
  getWorkoutStats: (day) => fetchJson(`/api/workouts/stats?today=${day}`),
  getLogs: (activityId) => fetchJson(`/api/activities/${activityId}/logs`),
  deleteLog: (id) => fetchJson(`/api/logs/${id}`, { method: 'DELETE' }),
};

// ==========================================
// 3. TOAST
// ==========================================
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = '';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-xl';
  icon.textContent = type === 'success' ? 'check_circle' : 'warning';
  icon.style.color = type === 'error' ? 'rgb(var(--error))' : 'rgb(var(--secondary))';
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + message));
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==========================================
// 4. ССЫЛКИ НА DOM
// ==========================================
const authScreen = document.getElementById('auth');
const appScreen = document.getElementById('app');
const viewContainer = document.getElementById('view');
const userEmailSpan = document.getElementById('userEmail');
const userNameSpan = document.getElementById('userName');

let authMode = 'login';

// ==========================================
// 5. ХЕЛПЕРЫ РЕНДЕРА
// ==========================================
function pageHeader(title, subtitle, rightNode) {
  const header = document.createElement('header');
  header.className = 'mb-md sm:mb-xl flex flex-wrap gap-4 justify-between items-end';
  const left = document.createElement('div');
  left.innerHTML = `
    <h2 class="text-headline-lg sm:text-headline-xl font-headline-xl text-on-surface">${title}</h2>
    ${subtitle ? `<p class="text-body-md sm:text-body-lg font-body-lg text-on-surface-variant mt-1">${subtitle}</p>` : ''}
  `;
  header.appendChild(left);
  if (rightNode) header.appendChild(rightNode);
  return header;
}

function backHeader(title) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-md flex items-center gap-3';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-on-surface hover:bg-surface-container-high/60 active:scale-95 transition shrink-0';
  back.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>';
  back.addEventListener('click', () => { state.selectedActivityId = null; renderCurrentTab(); });
  const h = document.createElement('h2');
  h.className = 'text-headline-lg font-headline-lg text-on-surface truncate';
  h.textContent = title;
  wrap.appendChild(back);
  wrap.appendChild(h);
  return wrap;
}

function renderAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  const authTabs = document.getElementById('authTabs');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authError = document.getElementById('authError');
  authError.textContent = '';
  authTabs.querySelectorAll('button').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    const isActive = (authMode === 'login' && action === 'login-tab') || (authMode === 'register' && action === 'register-tab');
    btn.className = isActive
      ? 'flex-1 py-3 text-center text-label-md font-label-md rounded-lg bg-primary text-on-primary shadow transition-all'
      : 'flex-1 py-3 text-center text-label-md font-label-md text-on-surface-variant rounded-lg transition-all';
  });
  authSubmitBtn.textContent = authMode === 'login' ? 'SIGN IN' : 'SIGN UP';
}

function updateNavUI() {
  // Сайдбар (.nav-link) и нижний таб-бар (.bottom-tab) — оба помечаются [data-tab]
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-tab') === state.activeTab && !state.selectedActivityId;
    btn.classList.toggle('active', active);
  });
}

async function renderCurrentTab() {
  updateNavUI();
  viewContainer.textContent = '';
  try {
    if (state.selectedActivityId) {
      await renderActivityDetail(state.selectedActivityId);
    } else if (state.activeTab === 'today') {
      await renderDashboardTab();
    } else if (state.activeTab === 'calendar') {
      await renderCalendarTab();
    } else if (state.activeTab === 'stats') {
      await renderStatsTab();
    } else if (state.activeTab === 'profile') {
      await renderProfileTab();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 6. TODAY (дашборд)
// ==========================================
async function renderDashboardTab() {
  const todayDate = localDay();
  let res;
  try {
    res = await api.getStats(todayDate, 1);
  } catch (err) {
    showToast('Failed to load dashboard', 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  // Подсчёт прогресса
  let overallPercent = 0, habitsLeft = 0, maxStreak = 0;
  if (activities.length > 0) {
    let completedSum = 0;
    activities.forEach((act) => {
      const comp = act.daily_goal > 0 ? Math.min(act.today_total / act.daily_goal, 1) : (act.today_total > 0 ? 1 : 0);
      completedSum += comp;
      if (comp < 1) habitsLeft++;
      if (act.streak > maxStreak) maxStreak = act.streak;
    });
    overallPercent = Math.round((completedSum / activities.length) * 100);
  }

  // Задача 1: убран дублирующий блок «Daily Score» — процент остаётся только в карточке Daily Momentum
  viewContainer.appendChild(pageHeader('Hi, Hero!', 'Ready to ascend today?'));

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('No habits yet', 'Add your first goal in the Profile tab.'));
    return;
  }

  // Сетка карточек (адаптивная ширина колонок ≥320px на десктопе)
  const grid = document.createElement('div');
  grid.className = 'card-grid';

  // Карточка сводки (Daily Momentum)
  const summary = document.createElement('div');
  summary.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 relative overflow-hidden flex flex-col';
  summary.innerHTML = `
    <h3 class="text-headline-md font-headline-md mb-1">Daily Momentum</h3>
    <p class="text-body-md font-body-md text-on-surface-variant mb-6">${habitsLeft === 0 ? "All goals done! You're weightless 🚀" : `Goals left today: ${habitsLeft}`}</p>
    <div class="mt-auto flex items-center justify-between">
      <div>
        <p class="text-headline-xl font-headline-xl text-primary leading-none">${overallPercent}%</p>
        <p class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">Ascended</p>
      </div>
      <div class="text-right text-secondary font-semibold flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
        <span class="text-headline-md font-headline-md">${maxStreak}d</span>
      </div>
    </div>
  `;
  grid.appendChild(summary);

  activities.forEach((act) => grid.appendChild(habitCard(act, todayDate)));
  viewContainer.appendChild(grid);
}

function habitCard(act, todayDate) {
  const color = act.color || '#0059b5';
  const card = document.createElement('div');
  // h-full + flex-col + mt-auto на блоке кнопок → карточки в ряду одинаковой высоты, кнопки прижаты к низу (задача 8)
  card.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col gap-md group hover:border-primary/30 transition-all duration-500 cursor-pointer';
  card.addEventListener('click', () => { state.selectedActivityId = act.id; renderCurrentTab(); });

  const isSimple = act.type === 'simple';
  const doneToday = act.today_total > 0;
  let percent = 0;
  if (isSimple) percent = doneToday ? 100 : 0;
  else if (act.daily_goal > 0) percent = Math.min((act.today_total / act.daily_goal) * 100, 100);
  else if (act.today_total > 0) percent = 100;
  const done = isSimple ? doneToday : (act.daily_goal > 0 && act.today_total >= act.daily_goal);

  // Шапка: название + стрик + (numeric — счётчик / simple — статус-галочка)
  const head = document.createElement('div');
  head.className = 'flex justify-between items-start';
  const streakColor = act.streak === 0 ? 'rgb(var(--outline))' : (done ? 'rgb(var(--secondary))' : color);
  const rightHtml = isSimple
    ? `<span class="material-symbols-outlined shrink-0 ml-2 text-3xl" style="font-variation-settings:'FILL' ${doneToday ? 1 : 0}; color:${doneToday ? 'rgb(var(--secondary))' : 'rgb(var(--outline-variant))'}">${doneToday ? 'check_circle' : 'radio_button_unchecked'}</span>`
    : `<span class="text-headline-md font-headline-md text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0 ml-2">${Number(act.today_total.toFixed(1))} / ${act.daily_goal}</span>`;
  head.innerHTML = `
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(act.name)}</span>
      <div class="flex items-center gap-1 font-semibold" style="color:${streakColor}">
        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' ${act.streak === 0 ? 0 : 1};">local_fire_department</span>
        <span class="text-label-md font-label-md">${act.streak} Day Streak</span>
      </div>
    </div>
    ${rightHtml}
  `;
  card.appendChild(head);

  // Прогресс-бар — цвет привычки (зелёный при выполнении)
  const track = document.createElement('div');
  track.className = 'w-full h-4 bg-surface-container-high rounded-full overflow-hidden relative';
  const fill = document.createElement('div');
  fill.className = 'absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out';
  fill.style.width = '0%';
  fill.style.background = done ? 'rgb(var(--secondary-container))' : color;
  fill.style.boxShadow = `0 0 12px ${done ? 'rgb(var(--secondary-container) / 0.5)' : color + '66'}`;
  track.appendChild(fill);
  card.appendChild(track);
  requestAnimationFrame(() => { fill.style.width = `${percent}%`; });

  // --- Разовая (simple): одна кнопка во всю ширину; повторное нажатие = отмена ---
  if (isSimple) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mt-auto w-full py-3 rounded-xl text-label-md font-label-md font-semibold flex items-center justify-center gap-2 transition-all active:scale-95';
    if (doneToday) {
      btn.style.background = 'rgb(var(--secondary-container))';
      btn.style.color = 'rgb(var(--on-surface))';
      btn.title = 'Tap to undo';
      btn.classList.add('hover:opacity-90');
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">check</span> Done today';
      btn.addEventListener('click', (e) => resetDay(e, act, todayDate));
    } else {
      btn.classList.add('bg-on-surface', 'text-on-primary', 'hover:opacity-90');
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">done</span> Mark Done';
      btn.addEventListener('click', (e) => quickLog(e, act, 1, todayDate));
    }
    card.appendChild(btn);
    return card;
  }

  // --- Численная (numeric): кнопки из quick_add_*; иначе ручной ввод ---
  const presets = [act.quick_add_1, act.quick_add_2, act.quick_add_3].filter((v) => v != null && v > 0);
  const hasGoal = act.daily_goal > 0;
  const remaining = hasGoal ? Math.max(act.daily_goal - act.today_total, 0) : 0;
  // «Done» логирует ТОЛЬКО остаток до цели; при достижении — неактивна (без дублей)
  const makeDone = () => {
    const d = document.createElement('button');
    d.type = 'button';
    if (remaining > 0) {
      d.className = 'bg-on-surface text-on-primary py-3 px-1 rounded-xl text-label-sm font-label-md hover:opacity-90 active:scale-95 transition-all';
      d.textContent = 'Done';
      d.addEventListener('click', (e) => quickLog(e, act, remaining, todayDate));
    } else {
      d.className = 'py-3 px-1 rounded-xl flex items-center justify-center cursor-default';
      d.style.background = 'rgb(var(--secondary-container))';
      d.style.color = 'rgb(var(--on-surface))';
      d.title = 'Goal reached';
      d.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span>';
      d.addEventListener('click', (e) => e.stopPropagation());
    }
    return d;
  };

  if (presets.length) {
    const btnRow = document.createElement('div');
    btnRow.className = 'grid gap-sm mt-auto';
    btnRow.style.gridTemplateColumns = `repeat(${presets.length + (hasGoal ? 1 : 0)}, minmax(0, 1fr))`;
    presets.forEach((val) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'glass-panel py-3 px-1 rounded-xl text-label-sm font-label-md hover:bg-surface-container-highest transition-colors active:scale-95';
      b.textContent = `+${Number(val)}`;
      b.addEventListener('click', (e) => quickLog(e, act, val, todayDate));
      btnRow.appendChild(b);
    });
    if (hasGoal) btnRow.appendChild(makeDone());
    card.appendChild(btnRow);
  } else {
    // Кнопки не заданы — ручной ввод + «Записать» (+ Done при наличии цели)
    const row = document.createElement('div');
    row.className = 'flex gap-sm mt-auto';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0'; input.step = 'any';
    input.placeholder = act.unit || 'number';
    input.className = 'field-input flex-1 py-2';
    input.addEventListener('click', (e) => e.stopPropagation());
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'glass-panel px-4 rounded-xl text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95';
    add.textContent = 'Log';
    add.addEventListener('click', (e) => {
      const v = parseFloat(input.value);
      if (!isFinite(v) || v <= 0) { e.stopPropagation(); showToast('Enter a number', 'error'); return; }
      input.value = '';
      quickLog(e, act, v, todayDate);
    });
    row.appendChild(input);
    row.appendChild(add);
    if (hasGoal) row.appendChild(makeDone());
    card.appendChild(row);
  }

  // Сброс сегодняшних записей (исправление ошибок ввода)
  if (act.today_total > 0) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'text-label-sm font-label-sm text-on-surface-variant/70 hover:text-error transition-colors self-center mt-2';
    reset.textContent = '↺ Reset today';
    reset.addEventListener('click', (e) => resetDay(e, act, todayDate));
    card.appendChild(reset);
  }

  return card;
}

async function quickLog(e, act, val, todayDate) {
  e.stopPropagation();
  if (!val || val <= 0) { showToast('Goal already reached 🎉'); return; }
  try {
    await api.addLog(act.id, val, todayDate);
    showToast(`Added +${Number(val.toFixed ? val.toFixed(1) : val)} ${act.unit || ''}`);
    await renderCurrentTab();
  } catch (err) {
    showToast('Failed to save log', 'error');
  }
}

// Сброс сегодняшних записей привычки (отмена/исправление)
async function resetDay(e, act, todayDate) {
  e.stopPropagation();
  if (!confirm(`Reset today's entries for "${act.name}"? This cannot be undone.`)) return;
  try {
    await api.clearDay(act.id, todayDate);
    showToast("Today's entries were reset");
    await renderCurrentTab();
  } catch (err) {
    showToast('Failed to reset', 'error');
  }
}

function emptyState(title, subtitle) {
  const el = document.createElement('div');
  el.className = 'glass-panel rounded-[32px] p-lg text-center shadow-sm';
  el.innerHTML = `
    <p class="text-headline-md font-headline-md text-on-surface mb-2">${title}</p>
    <p class="text-body-md font-body-md text-on-surface-variant">${subtitle}</p>
  `;
  return el;
}

// ==========================================
// 7. ДЕТАЛЬ ПРИВЫЧКИ
// ==========================================
async function renderActivityDetail(activityId) {
  const todayDate = localDay();
  let resp;
  try {
    resp = await api.getStats(todayDate, state.statsDays);
  } catch (err) {
    showToast('Failed to load details', 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const act = (resp.activities || []).find((a) => a.id === activityId);
  if (!act) {
    showToast('Activity not found', 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const color = act.color || '#0059b5';
  const isSimple = act.type === 'simple';
  const series = act.series || [];
  const doneDays = series.filter((s) => s.total > 0).length;
  // simple: «всего» = число выполненных дней; numeric: сумма значений
  const total = isSimple ? doneDays : series.reduce((a, c) => a + c.total, 0);
  const best = series.length ? Math.max(...series.map((s) => s.total)) : 0;

  viewContainer.appendChild(backHeader(act.name));

  // Hero + три плашки
  const hero = document.createElement('section');
  hero.className = 'grid grid-cols-12 gap-gutter mb-md';
  hero.innerHTML = `
    <div class="col-span-12 md:col-span-6 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col justify-center items-center text-center">
      <span class="text-headline-xl font-headline-xl text-primary leading-none">${isSimple ? doneDays : Number(total.toFixed(1))}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-2">${isSimple ? 'DAYS DONE' : 'Total ' + esc((act.unit || '').toUpperCase())}</span>
    </div>
    <div class="col-span-12 md:col-span-6 grid grid-cols-3 gap-gutter">
      ${miniStat('Today', isSimple ? (act.today_total > 0 ? '✓' : '—') : Number(act.today_total.toFixed(1)))}
      ${isSimple ? miniStat('Days', doneDays, color) : miniStat('Best', Number(best.toFixed(1)), color)}
      ${miniStat('Streak', act.streak + 'd')}
    </div>
  `;
  viewContainer.appendChild(hero);

  // Недельный график
  const chartSec = document.createElement('section');
  chartSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  const chartHead = document.createElement('div');
  chartHead.className = 'flex justify-between items-center mb-6';
  chartHead.innerHTML = `<h3 class="text-headline-md font-headline-md">Weekly Progress</h3><span class="text-label-md font-label-md text-primary">7 days</span>`;
  chartSec.appendChild(chartHead);

  const last7 = series.slice(-7);
  const maxVal = isSimple ? 1 : Math.max(...last7.map((s) => s.total), act.daily_goal || 1);
  const bars = document.createElement('div');
  bars.className = 'flex items-end justify-between h-40 gap-3 pt-4';
  const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay() (0 = Sun)
  last7.forEach((d) => {
    const isToday = d.day === todayDate;
    const date = new Date(d.day + 'T00:00:00');
    const val = isSimple ? (d.total > 0 ? 1 : 0) : d.total;
    const h = maxVal > 0 ? (val / maxVal) * 100 : 0;
    const done = !isSimple && act.daily_goal > 0 && d.total >= act.daily_goal;
    const col = document.createElement('div');
    col.className = 'flex-1 flex flex-col items-center gap-2 group relative';
    const tip = document.createElement('div');
    tip.className = 'absolute -top-2 bg-on-surface text-on-primary text-xs font-bold rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10';
    tip.textContent = isSimple ? (d.total > 0 ? 'done' : '—') : `${Number(d.total.toFixed(1))} ${act.unit || ''}`;
    const tr = document.createElement('div');
    tr.className = 'w-full bg-surface-container-high rounded-t-xl relative h-28 overflow-hidden';
    const bf = document.createElement('div');
    bf.className = 'absolute bottom-0 left-0 w-full rounded-t-xl transition-all duration-700 ease-out';
    bf.style.height = `${h}%`;
    bf.style.background = done ? 'rgb(var(--secondary-container))' : color;
    bf.style.boxShadow = done ? '0 0 10px rgb(var(--secondary-container) / 0.45)' : `0 0 10px ${color}55`;
    tr.appendChild(bf);
    const lab = document.createElement('span');
    lab.className = `text-label-sm font-label-sm ${isToday ? 'font-bold text-primary' : 'text-on-surface-variant/60'} text-center flex flex-col items-center`;
    lab.innerHTML = `<span>${wd[date.getDay()]}</span><span class="text-[10px] opacity-70 font-normal mt-0.5">${date.getDate()}</span>`;
    const valLabel = document.createElement('span');
    valLabel.className = 'text-[11px] font-bold text-center mb-1 shrink-0';
    valLabel.style.color = val > 0 ? (done ? 'rgb(var(--secondary))' : color) : 'rgb(var(--outline-variant))';
    valLabel.textContent = val > 0 ? (isSimple ? '✓' : Number(val.toFixed(1))) : '—';
    col.appendChild(tip); col.appendChild(valLabel); col.appendChild(tr); col.appendChild(lab);
    bars.appendChild(col);
  });
  chartSec.appendChild(bars);
  viewContainer.appendChild(chartSec);

  // Достижения
  const goldUnlocked = act.daily_goal > 0 ? (total >= 100 || total >= 10 * act.daily_goal) : (total >= 100);
  const badges = [
    { title: 'Bronze: First Step', icon: 'military_tech', unlocked: total > 0 },
    { title: 'Silver: Consistency', icon: 'local_fire_department', unlocked: act.streak >= 3 },
    { title: 'Gold: Century', icon: 'emoji_events', unlocked: goldUnlocked },
    { title: 'Platinum: Elite', icon: 'workspace_premium', unlocked: total >= 500 },
  ];
  const achSec = document.createElement('section');
  achSec.className = 'mb-md';
  achSec.innerHTML = '<h3 class="text-headline-md font-headline-md mb-md">Achievements</h3>';
  const achWrap = document.createElement('div');
  achWrap.className = 'grid grid-cols-2 sm:grid-cols-4 gap-gutter';
  badges.forEach((b, i) => {
    const c = document.createElement('div');
    c.className = `glass-panel rounded-2xl p-md flex flex-col items-center text-center shadow-sm ${b.unlocked ? '' : 'opacity-40'}`;
    c.innerHTML = `
      <div class="w-14 h-14 rounded-full ${b.unlocked ? 'bg-secondary/10 animate-float' : 'bg-surface-container-high'} flex items-center justify-center mb-2" style="animation-delay:${i * 0.6}s">
        <span class="material-symbols-outlined ${b.unlocked ? 'text-secondary' : 'text-outline'} text-3xl">${b.unlocked ? b.icon : 'lock'}</span>
      </div>
      <span class="text-label-sm font-label-sm font-bold text-center">${b.title}</span>
    `;
    achWrap.appendChild(c);
  });
  achSec.appendChild(achWrap);
  viewContainer.appendChild(achSec);

  // Последние логи
  const logSec = document.createElement('section');
  logSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  logSec.innerHTML = '<h3 class="text-headline-md font-headline-md mb-6">Recent Activity</h3>';
  const logList = document.createElement('div');
  logList.className = 'space-y-4';
  logList.innerHTML = '<p class="text-body-md font-body-md text-on-surface-variant text-center py-4">Loading logs...</p>';
  logSec.appendChild(logList);
  viewContainer.appendChild(logSec);

  // Асинхронно подгружаем индивидуальные записи
  api.getLogs(activityId).then((data) => {
    const logs = data.logs || [];
    logList.textContent = '';
    if (logs.length === 0) {
      logList.innerHTML = '<p class="text-body-md font-body-md text-on-surface-variant text-center py-4">No entries recently</p>';
      return;
    }
    logs.forEach((log) => {
      let timeStr = '';
      try {
        if (log.logged_at) {
          const dObj = new Date(log.logged_at);
          timeStr = dObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}

      const p = log.day.split('-');
      const dateFormatted = `${p[2]}.${p[1]}.${p[0]}`;

      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-4 bg-surface-container/50 rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors';
      
      const leftSide = document.createElement('div');
      leftSide.className = 'flex items-center gap-4 min-w-0';
      leftSide.innerHTML = `
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <span class="material-symbols-outlined">event_available</span>
        </div>
        <div class="min-w-0">
          <p class="text-label-md font-label-md font-bold truncate">${dateFormatted} <span class="text-xs font-normal text-on-surface-variant/60 ml-1">${timeStr}</span></p>
          <p class="text-label-sm font-label-sm text-on-surface-variant">${isSimple ? 'Check-in' : 'Amount logged'}</p>
        </div>
      `;
      item.appendChild(leftSide);

      const rightSide = document.createElement('div');
      rightSide.className = 'flex items-center gap-3 shrink-0';

      if (isSimple) {
        rightSide.innerHTML += '<span class="material-symbols-outlined text-3xl" style="color:rgb(var(--secondary));font-variation-settings:\'FILL\' 1;">check_circle</span>';
      } else {
        rightSide.innerHTML += `<p class="text-headline-md font-headline-md text-primary">${Number(log.amount.toFixed(1))} <span class="text-label-sm text-outline">${esc(act.unit || '')}</span></p>`;
      }

      // Кнопка удаления
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/70 hover:text-error hover:bg-error/10 active:scale-90 transition-all';
      delBtn.innerHTML = '<span class="material-symbols-outlined text-xl">delete</span>';
      delBtn.title = 'Delete entry';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this entry?')) return;
        try {
          await api.deleteLog(log.id);
          showToast('Entry deleted');
          await renderCurrentTab();
        } catch (err) {
          showToast('Failed to delete entry', 'error');
        }
      });
      rightSide.appendChild(delBtn);

      item.appendChild(rightSide);
      item.addEventListener('click', (e) => e.stopPropagation()); // предотвращаем переход при клике
      logList.appendChild(item);
    });
  }).catch((err) => {
    logList.innerHTML = '<p class="text-body-md font-body-md text-error text-center py-4">Failed to load logs</p>';
  });

  // Добавляем FAB (плавающую кнопку +)
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-40';
  fab.style.background = `linear-gradient(135deg, ${color}, rgb(var(--tertiary)))`;
  fab.style.boxShadow = `0 10px 25px ${color}66`;
  fab.innerHTML = '<span class="material-symbols-outlined text-[28px]">add</span>';
  fab.title = 'Add entry';
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    openLogModal();
  });
  viewContainer.appendChild(fab);
}

function miniStat(label, value, border) {
  return `
    <div class="glass-panel rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm" ${border ? `style="border:2px solid ${border}60"` : ''}>
      <span class="text-headline-md font-headline-md text-primary">${value}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">${label}</span>
    </div>`;
}

// ==========================================
// 8. ПРОФИЛЬ (настройки + управление привычками)
// ==========================================
async function renderProfileTab() {
  viewContainer.appendChild(pageHeader('Profile', 'Settings & habits'));

  // Карточка пользователя
  const userCard = document.createElement('div');
  userCard.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex items-center justify-between gap-3 mb-md';
  const email = (state.user && state.user.email) || '';
  userCard.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <span class="material-symbols-outlined text-2xl">person</span>
      </div>
      <div class="min-w-0">
        <p class="text-headline-md font-headline-md truncate">${esc(email.split('@')[0] || 'Hero')}</p>
        <p class="text-label-sm font-label-sm text-on-surface-variant truncate">${esc(email)}</p>
      </div>
    </div>
  `;
  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'btn-ghost px-4 py-2 shrink-0 flex items-center gap-2';
  logoutBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">logout</span> Sign out';
  logoutBtn.addEventListener('click', doLogout);
  userCard.appendChild(logoutBtn);
  viewContainer.appendChild(userCard);

  // Переключатель темы
  viewContainer.appendChild(themeToggleRow());

  // Управление привычками
  const habitsHead = document.createElement('div');
  habitsHead.className = 'flex items-center justify-between gap-3 mt-md mb-md';
  habitsHead.innerHTML = '<h3 class="text-headline-md font-headline-md">My Habits</h3>';
  const addBtnNode = document.createElement('button');
  addBtnNode.type = 'button';
  addBtnNode.className = 'btn-primary flex items-center gap-2 px-5';
  addBtnNode.innerHTML = '<span class="material-symbols-outlined text-[20px]">add</span> Add';
  addBtnNode.addEventListener('click', () => openActivityModal(null));
  habitsHead.appendChild(addBtnNode);
  viewContainer.appendChild(habitsHead);

  let res;
  try {
    res = await api.getActivities();
  } catch (err) {
    showToast('Failed to load habits', 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('No habits', 'Add your first habit now.'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  activities.forEach((act) => {
    const item = document.createElement('div');
    item.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex items-center justify-between gap-3';
    const left = document.createElement('div');
    left.className = 'min-w-0';
    left.innerHTML = `
      <h3 class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(act.name)}</h3>
      <div class="text-label-sm font-label-sm text-on-surface-variant mt-1 flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-full" style="background:${act.color || '#0059b5'}"></span>
        Goal: ${act.daily_goal} ${esc(act.unit || '')}
      </div>
    `;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn-ghost px-4 py-2 shrink-0';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => openActivityModal(act));
    item.appendChild(left);
    item.appendChild(edit);
    grid.appendChild(item);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 8.5 КАЛЕНДАРЬ (сетка месяца с отметками выполнения)
// ==========================================
async function renderCalendarTab() {
  viewContainer.appendChild(pageHeader('Calendar', 'Days with completed habits'));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const todayDate = localDay();

  // Тянем статистику с начала месяца по сегодня, чтобы знать дни с активностью
  const daysSoFar = now.getDate();
  let resp;
  try {
    resp = await api.getStats(todayDate, daysSoFar);
  } catch (err) {
    showToast('Failed to load calendar', 'error');
    return;
  }
  const activities = resp.activities || [];

  // Карта: день (YYYY-MM-DD) → массив цветов выполнивших привычек
  const dotsByDay = {};
  activities.forEach((act) => {
    const color = act.color || '#0059b5';
    (act.series || []).forEach((s) => {
      if (s.total > 0) {
        (dotsByDay[s.day] = dotsByDay[s.day] || []).push(color);
      }
    });
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const wrap = document.createElement('div');
  wrap.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
  wrap.innerHTML = `<h3 class="text-headline-md font-headline-md mb-md text-center">${monthNames[month]} ${year}</h3>`;

  // Заголовки дней недели (Пн..Вс)
  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d) => {
    const dow = document.createElement('div');
    dow.className = 'cal-dow';
    dow.textContent = d;
    grid.appendChild(dow);
  });

  // Пустые ячейки до первого дня (неделя начинается с понедельника)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Пн
  for (let i = 0; i < firstDow; i++) {
    const e = document.createElement('div');
    e.className = 'cal-cell empty';
    grid.appendChild(e);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (iso === todayDate ? ' today' : '');

    const num = document.createElement('span');
    num.textContent = day;
    cell.appendChild(num);

    const dots = document.createElement('div');
    dots.className = 'cal-dots';
    const colors = [...new Set(dotsByDay[iso] || [])].slice(0, 3);
    colors.forEach((c) => {
      const dot = document.createElement('span');
      dot.className = 'cal-dot';
      dot.style.background = c;
      dots.appendChild(dot);
    });
    cell.appendChild(dots);
    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  viewContainer.appendChild(wrap);

  // Легенда
  const legend = document.createElement('p');
  legend.className = 'text-label-sm font-label-sm text-on-surface-variant text-center mt-md';
  legend.textContent = 'Colored dots under a date mark habits completed that day.';
  viewContainer.appendChild(legend);
}

// ==========================================
// 9. STATS
// ==========================================
// Сегмент Habits / Gym для вкладки Stats
function statsModeSeg() {
  const seg = document.createElement('div');
  seg.className = 'seg mb-md';
  [['habits', 'Habits'], ['gym', 'Gym']].forEach(([m, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (state.statsMode === m ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { if (state.statsMode !== m) { state.statsMode = m; renderCurrentTab(); } });
    seg.appendChild(b);
  });
  return seg;
}

async function renderStatsTab() {
  // Режим Gym — собственный дашборд аналитики тренировок
  if (state.statsMode === 'gym') {
    viewContainer.appendChild(pageHeader('Stats', 'Gym analytics'));
    viewContainer.appendChild(statsModeSeg());
    await renderGymStats();
    return;
  }

  // Режим Habits: переключатель периода 7 / 30 дней
  const toggle = document.createElement('div');
  toggle.className = 'flex bg-surface-container rounded-xl p-1 border border-outline-variant/40';
  [7, 30].forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    const active = state.statsPeriod === d;
    b.className = active
      ? 'px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-label-md transition-all'
      : 'px-4 py-2 rounded-lg text-on-surface-variant text-label-md font-label-md transition-all';
    b.textContent = `${d} days`;
    b.addEventListener('click', () => { if (state.statsPeriod !== d) { state.statsPeriod = d; renderCurrentTab(); } });
    toggle.appendChild(b);
  });
  viewContainer.appendChild(pageHeader('Stats', 'Habit dynamics', toggle));
  viewContainer.appendChild(statsModeSeg());

  let resp;
  try {
    resp = await api.getStats(localDay(), state.statsPeriod);
  } catch (err) {
    showToast('Failed to load stats', 'error');
    return;
  }
  const activities = resp.activities || [];
  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('No data', 'Log habits to see analytics.'));
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-12 gap-gutter';
  activities.forEach((act) => {
    const color = act.color || '#0059b5';
    const isSimple = act.type === 'simple';
    const series = act.series || [];
    const doneDays = series.filter((s) => s.total > 0).length;
    // simple: сумма = число выполненных дней; numeric: сумма значений
    const sum = isSimple ? doneDays : series.reduce((a, c) => a + c.total, 0);
    const sumLabel = isSimple
      ? `Completed in ${state.statsPeriod} days: ${doneDays} ${doneDays === 1 ? 'day' : 'days'}`
      : `Total over ${state.statsPeriod} days: ${Number(sum.toFixed(1))} ${esc(act.unit || '')}`;
    const card = document.createElement('div');
    card.className = 'col-span-12 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-md border-b border-outline-variant/30 pb-3">
        <div class="min-w-0">
          <h3 class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(act.name)}</h3>
          <span class="text-label-sm font-label-sm text-on-surface-variant">${sumLabel}</span>
        </div>
        <div class="text-right shrink-0 ml-2 text-secondary font-semibold flex items-center gap-1">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
          <span class="text-headline-md font-headline-md">${act.streak}</span>
        </div>
      </div>
    `;
    // SVG-график (для simple — бинарные столбцы: выполнено/нет)
    const w = 460, hgt = 100, chartTop = 18, chartH = 62;
    const maxVal = isSimple ? 1 : Math.max(...series.map((s) => s.total), act.daily_goal || 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    svg.setAttribute('class', 'w-full h-24 mt-3');
    const gap = series.length > 10 ? 3 : 8;
    const bw = (w - gap * (series.length - 1)) / series.length;
    series.forEach((d, i) => {
      const val = isSimple ? (d.total > 0 ? 1 : 0) : d.total;
      let bh = maxVal > 0 ? (val / maxVal) * chartH : 0;
      if (val > 0 && bh < 4) bh = 4;
      const done = !isSimple && act.daily_goal > 0 && d.total >= act.daily_goal;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (i * (bw + gap)).toString());
      rect.setAttribute('y', (chartTop + chartH - bh).toString());
      rect.setAttribute('width', bw.toString());
      rect.setAttribute('height', bh.toString());
      rect.setAttribute('rx', '4');
      // var() в SVG работает только через style, не через presentation-атрибут fill
      rect.style.fill = done ? 'rgb(var(--secondary-container))' : (d.total > 0 ? color : 'rgb(var(--surface-container-high))');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = isSimple
        ? `${d.day}: ${d.total > 0 ? 'done' : '—'}`
        : `${d.day}: ${Number(d.total.toFixed(1))} / ${act.daily_goal} ${act.unit || ''}`;
      rect.appendChild(t);
      svg.appendChild(rect);

      // Рисуем числовое значение (подпись данных) над столбиком, если оно больше 0
      if (val > 0) {
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.textContent = isSimple ? '✓' : Number(val.toFixed(1));
        valText.setAttribute('x', (i * (bw + gap) + bw / 2).toString());
        valText.setAttribute('y', (chartTop + chartH - bh - 4).toString());
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('font-size', '10px');
        valText.setAttribute('font-weight', 'bold');
        valText.setAttribute('fill', done ? 'rgb(var(--secondary))' : color);
        valText.style.fill = done ? 'rgb(var(--secondary))' : color;
        svg.appendChild(valText);
      }

      // Рисуем подпись даты под каждым столбцом (для 7 дней — все, для 30 дней — с шагом 5)
      const showLabel = (series.length <= 7) || (i % 5 === 0) || (i === series.length - 1);
      if (showLabel) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const dateObj = new Date(d.day + 'T00:00:00');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
        text.textContent = `${dayStr}.${monthStr}`;
        text.setAttribute('x', (i * (bw + gap) + bw / 2).toString());
        text.setAttribute('y', '94');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', '600');
        text.style.fill = 'rgb(var(--on-surface-variant))';
        text.style.opacity = '0.85';
        svg.appendChild(text);
      }
    });
    card.appendChild(svg);
    grid.appendChild(card);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 9.5 GYM ANALYTICS (дашборд тренировок)
// ==========================================
async function renderGymStats() {
  let resp;
  try {
    resp = await api.getWorkoutStats(localDay());
  } catch (err) {
    showToast('Failed to load gym stats', 'error');
    return;
  }
  const exercises = resp.exercises || [];
  if (exercises.length === 0) {
    viewContainer.appendChild(emptyState('No workouts yet', 'Finish a workout in Gym Mode to see analytics.'));
    return;
  }

  const t = resp.tonnage || { d7: 0, d14: 0, d30: 0 };
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

  // Карточки тоннажа 7 / 14 / 30 дней (неон-свечение из тёмной темы — автоматически)
  const tonnageGrid = document.createElement('div');
  tonnageGrid.className = 'card-grid mb-md';
  [['7 days', t.d7], ['14 days', t.d14], ['30 days', t.d30]].forEach(([label, val]) => {
    const c = document.createElement('div');
    c.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col items-center justify-center text-center';
    c.innerHTML = `
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider">Total Tonnage · ${label}</span>
      <span class="text-headline-xl font-headline-xl text-primary leading-none mt-2">${fmt(val)}</span>
      <span class="text-label-sm font-label-sm text-on-surface-variant mt-1">kg lifted</span>
    `;
    tonnageGrid.appendChild(c);
  });
  viewContainer.appendChild(tonnageGrid);

  // Топ-3 упражнения по объёму (Volume / Max weight / Est 1RM)
  const head = document.createElement('h3');
  head.className = 'text-headline-md font-headline-md mb-md';
  head.textContent = 'Top 3 exercises by volume';
  viewContainer.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  (resp.top || []).forEach((ex, i) => {
    const c = document.createElement('div');
    c.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col gap-md';
    c.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-md font-bold shrink-0">${i + 1}</span>
        <h4 class="text-headline-md font-headline-md leading-[1.2] break-normal min-w-0">${esc(ex.name)}</h4>
      </div>
      <div class="grid grid-cols-3 gap-gutter mt-auto">
        ${miniStat('Volume', fmt(ex.volume) + ' kg')}
        ${miniStat('Max', fmt(ex.maxWeight) + ' kg')}
        ${miniStat('Est 1RM', fmt(ex.est1rm) + ' kg')}
      </div>
      <p class="text-label-sm font-label-sm text-on-surface-variant text-center">${ex.sets} sets · ${fmt(ex.reps)} reps total</p>
    `;
    grid.appendChild(c);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 10. МОДАЛКИ
// ==========================================
const activityModal = document.getElementById('activityModal');
const activityForm = document.getElementById('activityForm');
const modalTitle = document.getElementById('modalTitle');
const activityIdInput = document.getElementById('activityIdInput');
const actNameInput = document.getElementById('actNameInput');
const actUnitInput = document.getElementById('actUnitInput');
const actGoalInput = document.getElementById('actGoalInput');
const actColorInput = document.getElementById('actColorInput');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');
const colorPicker = document.getElementById('colorPicker');
const typeSeg = document.getElementById('typeSeg');
const actTypeInput = document.getElementById('actTypeInput');
const numericFields = document.getElementById('numericFields');
const actQa1Input = document.getElementById('actQa1Input');
const actQa2Input = document.getElementById('actQa2Input');
const actQa3Input = document.getElementById('actQa3Input');

// Переключение типа привычки: показываем поля «численной» только для numeric
function setActivityType(type) {
  const t = type === 'simple' ? 'simple' : 'numeric';
  actTypeInput.value = t;
  typeSeg.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-type') === t);
  });
  numericFields.style.display = t === 'simple' ? 'none' : '';
}

typeSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (btn) setActivityType(btn.getAttribute('data-type'));
});

const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const logActivitySelect = document.getElementById('logActivitySelect');
const logAmountInput = document.getElementById('logAmountInput');

function initColorPicker() {
  colorPicker.textContent = '';
  COLOR_PRESETS.forEach((color) => {
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color;
    if (state.selectedColor === color) sw.classList.add('active');
    sw.addEventListener('click', () => {
      colorPicker.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.selectedColor = color;
      actColorInput.value = color;
    });
    colorPicker.appendChild(sw);
  });
}

function openActivityModal(activity = null) {
  if (activity) {
    modalTitle.textContent = 'Edit Habit';
    activityIdInput.value = activity.id;
    actNameInput.value = activity.name;
    actUnitInput.value = activity.unit || '';
    actGoalInput.value = activity.daily_goal || 0;
    actQa1Input.value = activity.quick_add_1 != null ? activity.quick_add_1 : '';
    actQa2Input.value = activity.quick_add_2 != null ? activity.quick_add_2 : '';
    actQa3Input.value = activity.quick_add_3 != null ? activity.quick_add_3 : '';
    state.selectedColor = activity.color || '#0059b5';
    actColorInput.value = state.selectedColor;
    setActivityType(activity.type || 'numeric');
    deleteActivityBtn.hidden = false;
  } else {
    modalTitle.textContent = 'New Habit';
    activityIdInput.value = '';
    activityForm.reset();
    state.selectedColor = '#0059b5';
    actColorInput.value = '#0059b5';
    setActivityType('numeric');
    deleteActivityBtn.hidden = true;
  }
  initColorPicker();
  activityModal.classList.remove('hidden');
}

function closeActivityModal() { activityModal.classList.add('hidden'); }

function openLogModal() {
  logActivitySelect.textContent = '';
  if (!state.activities || state.activities.length === 0) {
    showToast('Create a habit first', 'error');
    return;
  }
  state.activities.forEach((act) => {
    const opt = document.createElement('option');
    opt.value = act.id;
    // не показываем пустые скобки для разовых/без единиц измерения
    opt.textContent = act.unit ? `${act.name} (${act.unit})` : act.name;
    logActivitySelect.appendChild(opt);
  });
  if (state.selectedActivityId) logActivitySelect.value = state.selectedActivityId;
  logAmountInput.value = '';
  logModal.classList.remove('hidden');
}

function closeLogModal() { logModal.classList.add('hidden'); }

// ==========================================
// 10.5 ТЕМА (Light / Dark)
// ==========================================
const THEME_KEY = 'antigravity-theme';

function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  syncThemeUI();
}

function toggleTheme() {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

// Приводит все переключатели/иконки к текущему состоянию темы
function syncThemeUI() {
  const dark = currentTheme() === 'dark';
  const sideIcon = document.querySelector('#themeToggleSide .material-symbols-outlined');
  if (sideIcon) sideIcon.textContent = dark ? 'light_mode' : 'dark_mode';
  document.querySelectorAll('.theme-switch .knob .material-symbols-outlined').forEach((el) => {
    el.textContent = dark ? 'dark_mode' : 'light_mode';
  });
}

// Строка-переключатель темы для вкладки Activities
function themeToggleRow() {
  const row = document.createElement('div');
  row.className = 'glass-panel rounded-2xl p-4 flex items-center justify-between shadow-sm mb-md';
  const label = document.createElement('div');
  label.innerHTML = `
    <p class="text-label-md font-label-md font-bold">Dark theme</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant">Light / dark appearance</p>
  `;
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'theme-switch';
  sw.setAttribute('aria-label', 'Toggle theme');
  const knob = document.createElement('span');
  knob.className = 'knob';
  knob.innerHTML = `<span class="material-symbols-outlined">${currentTheme() === 'dark' ? 'dark_mode' : 'light_mode'}</span>`;
  sw.appendChild(knob);
  sw.addEventListener('click', toggleTheme);
  row.appendChild(label);
  row.appendChild(sw);
  return row;
}

// ==========================================
// 10.6 КОНФИГ АВТОРИЗАЦИИ (Google / Turnstile)
// ==========================================
let turnstileEnabled = false;
let turnstileToken = null;
let turnstileWidgetId = null;

async function loadAuthConfig() {
  let cfg;
  try { cfg = await api.getConfig(); } catch (e) { return; }
  if (cfg.googleEnabled) {
    const g = document.getElementById('googleAuth');
    g.classList.remove('hidden');
    g.classList.add('flex');
  }
  if (cfg.turnstileSiteKey) initTurnstile(cfg.turnstileSiteKey);
}

function initTurnstile(siteKey) {
  turnstileEnabled = true;
  window.__onTurnstileLoad = () => {
    if (!window.turnstile) return;
    turnstileWidgetId = window.turnstile.render('#turnstileBox', {
      sitekey: siteKey,
      theme: 'auto',
      callback: (t) => { turnstileToken = t; },
      'expired-callback': () => { turnstileToken = null; },
      'error-callback': () => { turnstileToken = null; },
    });
  };
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__onTurnstileLoad';
  s.async = true; s.defer = true;
  document.head.appendChild(s);
}

function resetTurnstile() {
  turnstileToken = null;
  if (turnstileEnabled && window.turnstile && turnstileWidgetId !== null) {
    try { window.turnstile.reset(turnstileWidgetId); } catch (e) {}
  }
}

// Ошибка входа через Google приходит как ?auth_error=google
function showAuthErrorFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('auth_error')) {
      showToast('Google sign-in failed, please try again', 'error');
      u.searchParams.delete('auth_error');
      window.history.replaceState({}, '', u.pathname + u.search);
    }
  } catch (e) {}
}

// ==========================================
// 10.7 УВЕДОМЛЕНИЯ (Колокольчик — мотивация на сегодня)
// ==========================================
const MOTIVATION = [
  'Today is the best day to get 1% better. 💪',
  'A small step today is a big result a year from now. 🚀',
  'Discipline is the bridge between goals and achievement.',
  "Don't skip today: your streak lives on consistency. 🔥",
  "You don't have to be perfect. Just be consistent.",
  'Every check-in brings you closer to your best self. ✨',
  'Motivation gets you started, habit keeps you going. Go!',
];

const notifModal = document.getElementById('notifModal');

function openNotifModal() {
  const text = document.getElementById('notifText');
  // Сообщение «на сегодня» — стабильно в течение дня (зависит от даты)
  const d = new Date();
  const idx = (d.getFullYear() + d.getMonth() + d.getDate()) % MOTIVATION.length;
  if (text) text.textContent = MOTIVATION[idx];
  notifModal.classList.remove('hidden');
}
function closeNotifModal() { notifModal.classList.add('hidden'); }

// ==========================================
// 10.8 GYM MODE (полноэкранная тренировка, UI без БД)
// ==========================================
const gymModal = document.getElementById('gymModal');
const gymExerciseSelect = document.getElementById('gymExerciseSelect');
const gymWeightInput = document.getElementById('gymWeightInput');
const gymRepsInput = document.getElementById('gymRepsInput');
const gymSetList = document.getElementById('gymSetList');
const gymSetCount = document.getElementById('gymSetCount');

function openGymModal() {
  state.gymSets = [];
  gymWeightInput.value = '';
  gymRepsInput.value = '';
  renderGymSets();
  gymModal.classList.remove('hidden');
}
function closeGymModal() { gymModal.classList.add('hidden'); }

function renderGymSets() {
  gymSetList.textContent = '';
  gymSetCount.textContent = state.gymSets.length ? `(${state.gymSets.length})` : '';
  if (state.gymSets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-label-sm font-label-sm text-on-surface-variant text-center py-3';
    empty.textContent = 'No sets yet. Add your first one.';
    gymSetList.appendChild(empty);
    return;
  }
  state.gymSets.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'gym-set-row';
    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-sm font-bold shrink-0">${i + 1}</span>
        <div class="min-w-0">
          <p class="text-label-md font-label-md font-bold truncate">${esc(s.exercise)}</p>
          <p class="text-label-sm font-label-sm text-on-surface-variant">${s.weight} kg × ${s.reps}</p>
        </div>
      </div>
    `;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-btn shrink-0';
    del.innerHTML = '<span class="material-symbols-outlined text-[20px]">delete</span>';
    del.addEventListener('click', () => { state.gymSets.splice(i, 1); renderGymSets(); });
    row.appendChild(del);
    gymSetList.appendChild(row);
  });
}

function addGymSet() {
  const exercise = gymExerciseSelect.value;
  const weight = parseFloat(gymWeightInput.value);
  const reps = parseInt(gymRepsInput.value);
  if (!isFinite(weight) || weight < 0 || !isFinite(reps) || reps <= 0) {
    showToast('Enter weight and reps', 'error');
    return;
  }
  state.gymSets.push({ exercise, weight: Number(weight), reps });
  gymRepsInput.value = '';
  renderGymSets();
  gymRepsInput.focus();
}

async function finishGym() {
  const sets = state.gymSets.slice();
  if (sets.length === 0) {
    showToast('Add at least one set to finish the workout', 'error');
    return;
  }
  try {
    const res = await api.saveWorkout(localDay(), sets);
    closeGymModal();
    state.gymSets = [];
    showToast(`Workout saved: ${res.count} sets 💪`);
    // Если открыта вкладка Stats в режиме Gym — обновим аналитику
    if (state.activeTab === 'stats' && state.statsMode === 'gym' && !state.selectedActivityId) {
      renderCurrentTab();
    }
  } catch (err) {
    showToast('Failed to save workout', 'error');
  }
}

// ==========================================
// 11. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ==========================================
async function initApp() {
  try {
    const res = await api.getMe();
    if (res && res.user) {
      enterApp(res.user);
    } else {
      state.user = null;
      renderAuth();
    }
  } catch (err) {
    state.user = null;
    renderAuth();
  }
}

function enterApp(user) {
  state.user = user;
  userEmailSpan.textContent = user.email;
  userNameSpan.textContent = (user.email || 'Hero').split('@')[0];
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  state.activeTab = 'today';
  state.selectedActivityId = null;
  renderCurrentTab();
}

// Авторизация
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const authError = document.getElementById('authError');
  authError.textContent = '';
  if (turnstileEnabled && !turnstileToken) {
    authError.textContent = 'Please confirm you are not a robot';
    return;
  }
  try {
    const res = authMode === 'login'
      ? await api.login(email, password, turnstileToken)
      : await api.register(email, password, turnstileToken);
    showToast(authMode === 'login' ? 'Welcome back!' : 'Account created!');
    if (res && res.user) enterApp(res.user);
  } catch (err) {
    resetTurnstile();
    authError.textContent = err.message || 'Sign in / sign up error';
  }
});

document.getElementById('authTabs').addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  if (!action) return;
  authMode = action === 'login-tab' ? 'login' : 'register';
  renderAuth();
});

// Навигация (сайдбар + нижний таб-бар — все элементы с data-tab)
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const tab = btn.getAttribute('data-tab');
    if (!tab) return;
    state.activeTab = tab;
    state.selectedActivityId = null;
    await renderCurrentTab();
  });
});

// Переключатель темы в сайдбаре
document.getElementById('themeToggleSide').addEventListener('click', toggleTheme);

// Хелпер: безопасная привязка (элемент может отсутствовать)
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// Быстрая запись (кнопка в сайдбаре, десктоп) - удалена кнопка

// Gym Mode (центральная кнопка таб-бара + кнопка в сайдбаре)
on('gymModeBtnBar', 'click', openGymModal);
on('gymModeBtnSide', 'click', openGymModal);
on('closeGymBtn', 'click', closeGymModal);
on('gymAddSetBtn', 'click', addGymSet);
on('gymFinishBtn', 'click', finishGym);

// Колокольчик уведомлений (мобильная шапка + сайдбар)
on('notifBtn', 'click', openNotifModal);
on('notifBtnSide', 'click', openNotifModal);
on('closeNotifBtn', 'click', closeNotifModal);
on('notifOkBtn', 'click', closeNotifModal);

// Выход
async function doLogout() {
  if (!confirm('Sign out of your account?')) return;
  try {
    await api.logout();
    state.user = null;
    state.selectedActivityId = null;
    showToast('Signed out');
    renderAuth();
  } catch (err) {
    showToast('Failed to sign out', 'error');
  }
}
document.getElementById('logoutBtn').addEventListener('click', doLogout);

// Модалки — закрытие
document.getElementById('closeModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('closeLogModalBtn').addEventListener('click', closeLogModal);
document.getElementById('cancelLogModalBtn').addEventListener('click', closeLogModal);

// Сохранение лога
logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const actId = parseInt(logActivitySelect.value);
  const amount = parseFloat(logAmountInput.value);
  if (isNaN(actId) || isNaN(amount) || amount <= 0) return;
  try {
    await api.addLog(actId, amount, localDay());
    showToast('Log added!');
    closeLogModal();
    await renderCurrentTab();
  } catch (err) {
    showToast('Failed to save log', 'error');
  }
});

// Сохранение привычки
activityForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = activityIdInput.value;
  const name = actNameInput.value.trim();
  if (!name) return;
  const type = actTypeInput.value === 'simple' ? 'simple' : 'numeric';
  const numOrNull = (v) => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; };
  const data = {
    name,
    color: actColorInput.value,
    type,
    unit: type === 'simple' ? '' : actUnitInput.value.trim(),
    daily_goal: type === 'simple' ? 1 : (parseFloat(actGoalInput.value) || 0),
    quick_add_1: type === 'simple' ? null : numOrNull(actQa1Input.value),
    quick_add_2: type === 'simple' ? null : numOrNull(actQa2Input.value),
    quick_add_3: type === 'simple' ? null : numOrNull(actQa3Input.value),
  };
  try {
    if (id) {
      await api.updateActivity(id, data);
      showToast('Habit updated!');
    } else {
      await api.createActivity(data);
      showToast('Habit added!');
    }
    closeActivityModal();
    await renderCurrentTab();
  } catch (err) {
    showToast('Failed to save', 'error');
  }
});

// Удаление привычки
deleteActivityBtn.addEventListener('click', async () => {
  const id = activityIdInput.value;
  if (!id) return;
  if (!confirm('Delete this habit permanently?')) return;
  try {
    await api.deleteActivity(id);
    showToast('Habit deleted', 'error');
    closeActivityModal();
    if (state.selectedActivityId === parseInt(id)) state.selectedActivityId = null;
    await renderCurrentTab();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  syncThemeUI();
  showAuthErrorFromUrl();
  loadAuthConfig();
  initApp();
});
