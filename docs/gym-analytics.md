# Gym Analytics

Внутренние дашборды Gym Mode прямо на сайте (вкладка **Stats → Gym**)
с сохранением тренировок в D1. Схема сделана **BI-ready** (плоский JOIN
`workout_sets` × `exercises`), поэтому подключение Power BI/Tableau или прямой
доступ к D1 возможны без изменения таблиц.

Стек: Cloudflare Workers + D1 + vanilla JS. Стиль: Neon Glow, приоритет — десктоп
(на мобиле блоки стекаются).

## База данных

Таблицы из [schema.sql](../schema.sql):

- **`exercises`** — справочник упражнений на пользователя, `UNIQUE(user_id, name)`,
  дефолты (`default_sets/reps/weight/calories`) и группа мышц (`target_muscle`).
- **`workout_sets`** — подходы: `weight`, `reps`, `calories`, `day`, `logged_at`.
- Индексы: `idx_wsets_user_day`, `idx_wsets_user_ex`, `idx_ex_user`.

## API ([_worker.js](../_worker.js))

| Метод | Маршрут | Функция | Описание |
|---|---|---|---|
| POST | `/api/workouts` | `saveWorkout()` | Валидация (≤100 подходов, weight≥0, reps>0), upsert упражнения `ON CONFLICT(user_id,name)`, вставка подходов. Rate-limit 120/60 c. |
| GET | `/api/workouts/stats` | `workoutStats()` | Тоннаж `SUM(weight*reps)` за 7/14/30 дней + по упражнениям all-time: Volume, Max Weight, Est 1RM (Эпли `weight*(1+reps/30)`), sets, reps; `top` = первые 3 по объёму. |
| GET | `/api/workouts/day` | `workoutDay()` | Подходы за конкретный день (JOIN с именем упражнения). |
| GET | `/api/workouts/progress` | `exerciseProgress()` | Прогресс по упражнению: макс. вес и объём по дням. |
| GET | `/api/workouts/muscles` | `muscleStats()` | Распределение по группам мышц за 30 дней. |

## Фронтенд ([public/app.js](../public/app.js))

- `api.saveWorkout(day, sets)`, `api.getWorkoutStats(day)`.
- `state.statsMode` = `'habits' | 'gym'`.
- `finishGym()` — запись подходов, тост `Workout saved: N sets`, авто-обновление Stats.
- `renderStatsTab()` — сегмент **Habits / Gym** (`statsModeSeg()`); период 7/30 только в Habits.
- `renderGymStats()` — неон-карточки тоннажа 7/14/30 + Top-3 упражнения (Volume / Max / Est 1RM).

## BI-коннектор (отложено)

Схема уже BI-ready. Возможное расширение — `GET /api/bi/export` с Bearer-токеном
`BI_TOKEN`, отдающий плоскую таблицу (`set_id, day, exercise, weight, reps, volume, user_id`)
через JOIN. Подключение Power BI/Tableau или прямой доступ к D1 — без изменения таблиц.
