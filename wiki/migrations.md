---
title: Migrations
category: Data
tags: [d1, migration, ops]
sources: [migration.sql, schema.sql, README.md]
updated: 2026-06-03
---

# Миграции БД

`schema.sql` использует `CREATE TABLE IF NOT EXISTS`, поэтому **новые колонки в уже
созданные таблицы сами не добавятся**. Для этого — точечный `migration.sql` (`ALTER TABLE`).

## Текущая миграция (`migration.sql`)
Добавляет планирование тренировок и калории:
- `exercises.default_sets`, `default_reps`, `default_weight`, `default_calories`
- `workout_sets.calories`

## Применение
```bash
# локально
npx wrangler d1 execute trecker --local  --file=migration.sql
# на проде (перед деплоем бэкенда с новыми полями)
npx wrangler d1 execute trecker --remote --file=migration.sql
```

> SQLite не поддерживает `ADD COLUMN IF NOT EXISTS`. Повторный прогон на уже мигрированной
> базе даст «duplicate column» — это **ожидаемо**, не страшно.

## Правила
- Миграции пишутся идемпотентно по смыслу и применяются **вручную** через `wrangler d1 execute --remote`.
- `schema.sql` держать в актуальном состоянии (чтобы свежая база поднималась сразу полной).
- Прод-миграция (`--remote`) — **необратимое действие**, спрашивать подтверждение. См. [[conventions]], [[deploy]].

Полезные проверки колонок/данных — в [README.md](../README.md). Таблицы — [[data-model]].
