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
