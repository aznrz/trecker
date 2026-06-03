---
title: Feature Flags
category: Auth
tags: [config, secrets, feature-flag]
sources: [_worker.js, AGENTS.md]
updated: 2026-06-03
---

# Фича-флаги

Фичи включаются **заданием секретов** в Cloudflare. Пока секрет не задан — поведение как
раньше, прод не ломается. Фронт узнаёт, что включено, из `GET /api/config`.

## Флаги
- **Google OAuth** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. Детали — [[google-oauth]].
- **Cloudflare Turnstile** (антибот) — `TURNSTILE_SECRET` + `TURNSTILE_SITEKEY`. См. [[auth]].

## Задать секрет
```bash
npx wrangler secret put ИМЯ
```

Секреты хранятся отдельно от кода в Cloudflare и переживают редеплои (см. [[deploy]]).
Не коммитить секреты — [[conventions]].
