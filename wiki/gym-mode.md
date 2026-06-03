---
title: Gym Mode
category: Data
tags: [workouts, exercises, bi]
sources: [_worker.js, schema.sql]
updated: 2026-06-03
---

# Режим зала (Gym Mode)

Отдельная подсистема для силовых: справочник упражнений на пользователя и записанные подходы.

## Данные
- **`exercises`** — справочник: `name` (UNIQUE на пользователя), дефолты подхода
  (`default_sets/reps/weight/calories`). Дефолты помогают быстро заполнять новые записи.
- **`workout_sets`** — фактические подходы: `weight` (кг), `reps`, `calories`, `day`, `logged_at`.
- Структура **BI-ready**: плоский JOIN `workout_sets × exercises` по `exercise_id`.

См. полную схему — [[data-model]].

## API
- `GET/POST /exercises`, `PATCH/DELETE /exercises/:id`
- `POST /workouts` — записать подход(ы)
- `GET /workouts/stats` — статистика
- `GET /workouts/day` — подходы за день
- `GET /workouts/progress` — прогресс по упражнению

Полная таблица — [[api-reference]].

## Связанное
- Поля калорий/дефолтов добавлены миграцией — [[migrations]].
