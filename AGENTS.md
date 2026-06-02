# AGENTS.md

Инструкции для AI-агентов, работающих с этим репозиторием.

## Что это

Личный трекер активностей (Habit Tracker) на **Cloudflare Workers + D1**.
Прод: https://trecker.ms-cert.workers.dev

## Архитектура

- **`_worker.js`** — весь бэкенд: роутер, аутентификация, API. Запросы `/api/*`
  обрабатывает воркер, остальное (статика) отдаётся из `public/` через binding `ASSETS`.
- **`public/`** — фронтенд (ванильный JS, без сборки): `index.html`, `app.js`,
  `style.css`, `manifest.json`, `icon.svg`.
- **`schema.sql`** — схема D1 (SQLite). Таблицы: `users`, `activities`, `logs`,
  `sessions`, `rate_limits`.
- **`wrangler.jsonc`** — конфиг Cloudflare. Worker name `trecker`, D1 binding `DB`.

## Команды

```
npm run dev              # локальная разработка (wrangler dev, http://localhost:8787)
npm run deploy           # ручной деплой (обычно не нужен — см. ниже)
npm run db:init          # применить schema.sql к удалённой D1
npm run db:init:local    # применить schema.sql к локальной D1
```

Произвольный SQL по удалённой базе:
```
npx wrangler d1 execute trecker --remote --command "SELECT ..."
```

## Деплой

Прод **авто-деплоится из Git** (push в `main`). Ручной `wrangler deploy` обычно не нужен.
Секреты хранятся отдельно от кода в Cloudflare и переживают редеплои.

## Фича-флаги (через секреты Cloudflare)

Фичи включаются заданием секретов; пока секрет не задан — поведение как раньше,
прод не ломается. `/api/config` сообщает фронту, что включено.

- **Google OAuth** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
  Подробности и нюансы: см. [README.md](README.md).
- **Cloudflare Turnstile** (антибот) — `TURNSTILE_SECRET` + `TURNSTILE_SITEKEY`.

Задать секрет: `npx wrangler secret put ИМЯ`.

## Соглашения

- Комментарии в коде и сообщения коммитов — **на русском**.
- Миграции БД пишутся идемпотентно (`IF NOT EXISTS`, `ADD COLUMN` с проверкой) и
  применяются вручную через `wrangler d1 execute --remote`. Схему в `schema.sql`
  держать в актуальном состоянии.
- Не коммитить секреты. Все ключи/токены — только через `wrangler secret put`.

## Осторожно (необратимые действия — спрашивай подтверждение)

- Миграции боевой D1 (`--remote`).
- Запись/сброс секретов в Cloudflare.
- `git push` в `main` (триггерит авто-деплой на прод).
