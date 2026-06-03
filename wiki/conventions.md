---
title: Conventions
category: Ops
tags: [conventions, style, safety]
sources: [AGENTS.md]
updated: 2026-06-03
---

# Соглашения проекта

- **Язык.** Комментарии в коде и сообщения коммитов — **на русском**.
- **Миграции.** Идемпотентны по смыслу (`IF NOT EXISTS`, точечные `ADD COLUMN`),
  применяются вручную через `wrangler d1 execute --remote`. `schema.sql` держать актуальным.
  Детали — [[migrations]].
- **Секреты.** Не коммитить. Все ключи/токены — только через `wrangler secret put`.
  Фичи включаются секретами — [[feature-flags]].
- **Необратимые действия** (спрашивать подтверждение): прод-миграции (`--remote`),
  запись/сброс секретов, `git push` в `main` (авто-деплой). См. [[deploy]].

Эти правила — выжимка из [AGENTS.md](../AGENTS.md) (Layer 3). При расхождении первичен AGENTS.md.
