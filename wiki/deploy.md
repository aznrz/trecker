---
title: Deploy
category: Ops
tags: [deploy, cloudflare, ci]
sources: [AGENTS.md, README.md, package.json]
updated: 2026-06-03
---

# Деплой и эксплуатация

Прод **авто-деплоится из Git** (push в `main`). Ручной `wrangler deploy` обычно не нужен.

## Команды
```bash
npm run dev              # локальная разработка (wrangler dev, http://localhost:8787)
npm run deploy           # ручной деплой (обычно не нужен)
npm run db:init          # применить schema.sql к удалённой D1
npm run db:init:local    # применить schema.sql к локальной D1
```
Произвольный SQL по удалённой базе:
```bash
npx wrangler d1 execute trecker --remote --command "SELECT ..."
```

## Секреты
Хранятся отдельно от кода в Cloudflare и **переживают редеплои** — следующий деплой из Git
их не сотрёт. Задание — `npx wrangler secret put ИМЯ`. См. [[feature-flags]].

## Необратимые действия (спрашивать подтверждение)
- Миграции боевой D1 (`--remote`) — см. [[migrations]].
- Запись/сброс секретов в Cloudflare.
- `git push` в `main` (триггерит авто-деплой на прод).

Полный список соглашений — [[conventions]].
