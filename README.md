# Habit Tracker

Приложение на Cloudflare Workers + D1. Прод: https://trecker.ms-cert.workers.dev

> 📚 База знаний проекта (вики по [методу Карпатого](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)) — в [wiki/](wiki/index.md). Правила её ведения — в [AGENTS.md](AGENTS.md).

## Локальный запуск

```bash
npm install            # один раз
npm run dev            # запуск локального сервера (wrangler dev)
```

Откройте в браузере: **http://localhost:8787** (он же `http://127.0.0.1:8787`).

Остановить сервер — `Ctrl+C` в терминале.

### База данных (D1)

Локальная БД живёт в `.wrangler/state` (создаётся автоматически). Если таблиц ещё нет
или вы развернули проект с нуля — инициализируйте схему:

```bash
npm run db:init:local      # применить schema.sql к ЛОКАЛЬНОЙ базе
```

**Миграции существующей базы.** Схема использует `CREATE TABLE IF NOT EXISTS`, поэтому новые
колонки в уже созданные таблицы сами не добавятся — для этого есть [migration.sql](migration.sql)
(точечные `ALTER TABLE`: дефолты упражнений + калории подходов):

```bash
# локально (если таблицы exercises/workout_sets уже были созданы старой схемой):
npx wrangler d1 execute trecker --local --file=migration.sql

# на проде (выполнять перед деплоем бэкенда с новыми полями):
npx wrangler d1 execute trecker --remote --file=migration.sql
```

> SQLite не поддерживает `ADD COLUMN IF NOT EXISTS`. Повторный прогон `migration.sql`
> на уже мигрированной базе даст ошибку «duplicate column» — это ожидаемо, не страшно.

Полезные проверки:

```bash
# какие колонки в таблице
npx wrangler d1 execute trecker --local --command "SELECT name FROM pragma_table_info('exercises');"
# последние сохранённые подходы (вес/повторы/калории)
npx wrangler d1 execute trecker --local --command "SELECT exercise_id, weight, reps, calories FROM workout_sets ORDER BY id DESC LIMIT 5;"
```

### Деплой

```bash
npm run deploy
```

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
