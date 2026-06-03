---
title: Data Model
category: Data
tags: [d1, sqlite, schema]
sources: [schema.sql]
updated: 2026-06-03
---

# Модель данных (D1 / SQLite)

Схема — в `schema.sql`. Все таблицы создаются через `CREATE TABLE IF NOT EXISTS`.
Изменения уже развёрнутой базы — через [[migrations]].

## Таблицы
- **`users`** — `id`, `email` (UNIQUE), `pass_hash`, `google_id` (NULL у обычных аккаунтов),
  `created_at`. Индекс `idx_users_google`. Вход — см. [[auth]], [[google-oauth]].
- **`activities`** — привычки пользователя: `name`, `unit`, `color`, `daily_goal`,
  `type` (`numeric` | `simple`), `quick_add_1..3` (кнопки быстрого ввода), `sort`.
- **`logs`** — записи: `activity_id`, `amount`, `day` (локальный `YYYY-MM-DD` для группировки
  и streak), `logged_at` (ISO timestamp).
- **`exercises`** — справочник упражнений (на пользователя): дефолты `default_sets/reps/weight/calories`,
  `UNIQUE(user_id, name)`. См. [[gym-mode]].
- **`workout_sets`** — подходы: `exercise_id`, `weight` (кг), `reps`, `calories`, `day`, `logged_at`.
  BI-ready: плоский JOIN `workout_sets × exercises` по `exercise_id`.
- **`rate_limits`** — счётчики частоты запросов по IP: `k` = `"<scope>:<ip>"`, `cnt`, `win`. См. [[auth]].

## Индексы
`idx_logs_user_day`, `idx_logs_user_act`, `idx_act_user`, `idx_wsets_user_day`,
`idx_wsets_user_ex`, `idx_ex_user`, `idx_users_google`.

Эндпоинты, читающие/пишущие эти таблицы — [[api-reference]].
