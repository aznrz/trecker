# Habit Tracker

Приложение на Cloudflare Workers + D1. Прод: https://trecker.ms-cert.workers.dev

## Вход через Google (OAuth)

Реализован как фича-флаг: кнопка «Войти через Google» включается автоматически,
когда в Cloudflare заданы секреты `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`.
Фронт узнаёт о включении из `/api/config` (`googleEnabled: true`).

OAuth-клиент: проект Google Cloud `habit-tracker` (`habit-tracker-498209`),
client name «Habit Tracker Web».

Redirect URI:
- `https://trecker.ms-cert.workers.dev/api/auth/google/callback`
- `http://localhost:8787/api/auth/google/callback`

### Важные нюансы

1. **Режим Testing.** Сейчас войти могут только test users из Google Console —
   пока это только `naziz.kz@gmail.com`. Чтобы пускать любых пользователей, надо
   в Google Console нажать **Publish app** (для базовых scope `email`/`profile`/`openid`
   верификация Google обычно не требуется).

2. **Засветившийся секрет.** `CLIENT_SECRET` мелькнул в чате. Он уже лежит в
   Cloudflare и больше нигде не нужен. Если хочешь перестраховаться — в
   Google Console → **Clients → Habit Tracker Web → Reset secret**, затем перезаписать
   его в Cloudflare:
   ```
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

3. **Авто-деплой из Git.** Секреты хранятся отдельно от кода и переживают редеплои —
   следующий деплой из Git их не сотрёт.

### Как задать секреты заново (на новом окружении)

```
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Колонка `users.google_id` и индекс `idx_users_google` должны существовать в D1
(см. [schema.sql](schema.sql)).
