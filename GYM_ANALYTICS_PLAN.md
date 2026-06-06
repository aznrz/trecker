# Gym Analytics — план и чек-лист

Цель: внутренние дашборды Gym Mode прямо на сайте (вкладка **Stats → Gym**) с сохранением тренировок в D1. BI-экспорт отложен (подключусь к базе сам позже), но схема сделана **BI-ready** (плоский JOIN `workout_sets` × `exercises`).

Стек: Cloudflare Workers + D1 + Vanilla JS. Стиль: Neon Glow. Приоритет — десктоп (на мобиле блоки стекаются).

Прод: https://trecker.ms-cert.workers.dev · деплой вручную `npx wrangler deploy` (Git-автодеплоя нет).

---

## Часть 1 — On-site Gym Analytics

### Сделано (в этом коммите)
- [x] **schema.sql** — таблицы `exercises` (UNIQUE(user_id,name)) и `workout_sets` (weight, reps, day, logged_at) + индексы `idx_wsets_user_day`, `idx_wsets_user_ex`, `idx_ex_user`.
- [x] **_worker.js — `POST /api/workouts`** — `saveWorkout()`: валидация (≤100 подходов, weight≥0, reps>0), upsert упражнения (`ON CONFLICT(user_id,name) … RETURNING id`), вставка подходов; rate-limit `rateOk(env,"api",…,120,60)`.
- [x] **_worker.js — `GET /api/workouts/stats`** — `workoutStats()`: тоннаж `SUM(weight*reps)` за 7/14/30 дней (один проход по дням) + по упражнениям all-time: Volume, Max Weight, Est 1RM (Эпли `weight*(1+reps/30)`), sets, reps; `top` = первые 3 по объёму.
- [x] **app.js — `api`** — `saveWorkout(day,sets)`, `getWorkoutStats(day)`.
- [x] **app.js — `state.statsMode`** = `'habits' | 'gym'`.
- [x] **app.js — `finishGym()`** — пишет подходы через `api.saveWorkout`, тост `Workout saved: N sets`, авто-обновление Stats если открыт режим Gym.
- [x] **app.js — `renderStatsTab()`** — сегмент **Habits / Gym** (`statsModeSeg()`); период 7/30 только в Habits.
- [x] **app.js — `renderGymStats()`** — неон-карточки тоннажа 7/14/30 + Top-3 упражнения (Volume / Max / Est 1RM, sets·reps) на `.card-grid` + `.glass-panel rounded-[32px]`.
- [x] Синтаксис проверен: `node --check _worker.js`, `node --check public/app.js` — OK.

### Осталось (продолжить завтра)
- [ ] **Миграция локальной БД:** `npm run db:init:local` (CREATE IF NOT EXISTS добавит новые таблицы).
- [ ] **Локальная проверка:** `npm run dev` → войти → Gym Mode → добавить подходы → Finish → Stats → Gym: видны тоннаж 7/14/30 и Top-3. Проверить тёмную тему и десктоп-раскладку.
- [ ] **Миграция прод-БД (D1 remote):** `npx wrangler d1 execute trecker --remote --file=./schema.sql`.
- [ ] **Деплой:** `npx wrangler deploy`.
- [ ] (Опц.) сделать список упражнений в модалке Gym редактируемым / добавить свои.

## Часть 2 — BI-коннектор (ОТЛОЖЕНО)
- [ ] `GET /api/bi/export` — Bearer `BI_TOKEN`, плоская таблица (set_id, day, exercise, weight, reps, volume, user_id) через JOIN.
- [ ] `BI_TOKEN` в `.dev.vars.example` + секрет в Cloudflare.
- Примечание: схема уже BI-ready, подключение Power BI/Tableau или прямой доступ к D1 — без изменения таблиц.

---

## Как продолжить на другом ноуте
1. `git pull`
2. Создать `.dev.vars` из `.dev.vars.example` (нужен `SESSION_SECRET`).
3. `npm install`
4. Выполнить пункты из «Осталось»: миграция → `npm run dev` → проверка → деплой.
