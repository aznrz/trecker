---
title: Google OAuth
category: Auth
tags: [oauth, google, feature-flag]
sources: [_worker.js, README.md]
updated: 2026-06-03
---

# Вход через Google (OAuth)

Реализован как **фича-флаг**: кнопка «Войти через Google» включается автоматически,
когда в Cloudflare заданы секреты `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`.
Фронт узнаёт о включении из `GET /api/config` (`googleEnabled: true`). См. [[feature-flags]].

## Эндпоинты
- `GET /api/auth/google` — старт авторизации.
- `GET /api/auth/google/callback` — колбэк.

## Параметры OAuth-клиента
- Проект Google Cloud: `habit-tracker` (`habit-tracker-498209`), client «Habit Tracker Web».
- Redirect URI:
  - `https://trecker.ms-cert.workers.dev/api/auth/google/callback`
  - `http://localhost:8787/api/auth/google/callback`

## Нюансы
1. **Режим Testing.** Пока пускает только test users из Google Console (сейчас `naziz.kz@gmail.com`).
   Чтобы пускать всех — **Publish app** (для базовых scope `email`/`profile`/`openid`
   верификация Google обычно не требуется).
2. **Хранение секретов.** `CLIENT_SECRET` лежит в Cloudflare и нигде в коде не дублируется.
   При необходимости — Reset secret в Google Console и перезапись: `npx wrangler secret put GOOGLE_CLIENT_SECRET`.
3. **Авто-деплой из Git.** Секреты живут отдельно от кода и переживают редеплои. См. [[deploy]].

Колонка `users.google_id` и индекс `idx_users_google` должны существовать в D1 — см. [[data-model]].
Подробности в [README.md](../README.md). Общая аутентификация — [[auth]].
