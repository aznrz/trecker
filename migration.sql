-- Файл: migration.sql
-- Точечная миграция уже развёрнутой базы D1 (SQLite): добавляем метрики
-- для планирования тренировок (дефолты упражнений) и калории по подходам.
-- SQLite не поддерживает ADD COLUMN IF NOT EXISTS — повторный прогон на уже
-- мигрированной базе даст "duplicate column", это ожидаемо.

ALTER TABLE exercises ADD COLUMN default_sets INTEGER;
ALTER TABLE exercises ADD COLUMN default_reps INTEGER;
ALTER TABLE exercises ADD COLUMN default_weight REAL;
ALTER TABLE exercises ADD COLUMN default_calories REAL;
ALTER TABLE exercises ADD COLUMN target_muscle TEXT NOT NULL DEFAULT 'Разное';

ALTER TABLE workout_sets ADD COLUMN calories REAL;

-- Учёт калорий для привычек: настройка на привычке + снимок в истории логов.
-- calorie_kind делает направление самодокументируемым (GROUP BY calorie_kind).
ALTER TABLE activities ADD COLUMN track_calories INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN calorie_kind TEXT;
ALTER TABLE activities ADD COLUMN calories_per_unit REAL;

ALTER TABLE logs ADD COLUMN calories_logged REAL;
ALTER TABLE logs ADD COLUMN calorie_kind TEXT;

-- Профиль пользователя: вес/рост для оценки калорий упражнений (по весу тела) и BMI.
ALTER TABLE users ADD COLUMN weight REAL;
ALTER TABLE users ADD COLUMN height REAL;
