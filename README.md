# Habit Tracker

PWA-приложение для отслеживания ежедневных привычек.

**Прод:** https://sport.ms-cert.workers.dev
**Воркер:** `sport` (Cloudflare Workers)
**БД:** D1 `trecker` (`8de67ef9-b00c-40ba-9bbb-9b1740869b54`)

> Деплой вручную через `npm run deploy`. Git-автодеплоя нет.

---

## Возможности

- Привычки двух типов: числовые (подтягивания, страницы, км) и простые (отметить / не отметить)
- Дневной дашборд с прогресс-барами и стриками
- Кнопки быстрого ввода (+1, +5, +10 и т.д.)
- Календарь выполнения за месяц
- Статистика с графиками за 7 / 30 дней
- Gym Mode — запись тренировок (упражнение, вес, повторы) + аналитика тоннажа и топ-3 упражнений
- Светлая / тёмная тема, интерфейс на русском и английском
- Push-уведомления в 8:00, 13:00 и 20:00 по Алматы (если есть невыполненные привычки)
- Вход через email/пароль или Google OAuth

---

## Стек

| Слой | Технология |
|---|---|
| Хостинг | Cloudflare Workers |
| База данных | Cloudflare D1 (SQLite) |
| Фронтенд | Vanilla JS SPA, Tailwind CSS |
| Push-уведомления | Web Push API (RFC 8291), VAPID (RFC 8292) |
| Аутентификация | PBKDF2-SHA256, signed cookie, Google OAuth |
| Защита | Cloudflare Turnstile, rate limiting |

---

## Структура проекта

```
_worker.js          бэкенд: API, аутентификация, push, cron-хендлер
public/
  index.html        оболочка SPA
  app.js            весь фронтенд (State → API → Render)
  sw.js             Service Worker (приём push-уведомлений)
  style.css         стили (Tailwind + CSS-переменные тем)
  manifest.json     PWA-манифест
schema.sql          схема D1: users, activities, logs, workouts, push_subscriptions
wrangler.jsonc      конфиг Cloudflare Workers (имя, D1, cron)
generate-vapid-keys.js  разовый скрипт генерации VAPID-ключей
```

---

## Полный пайплайн: с нуля до прода

### 1. Установка зависимостей

```bash
npm install
```

### 2. Локальные переменные окружения

```bash
cp .dev.vars.example .dev.vars
# Открой .dev.vars и заполни SESSION_SECRET и VAPID_* (см. шаг 4)
```

### 3. Миграция БД

Первый раз или после изменений в `schema.sql`:

```bash
# Локально (для wrangler dev):
npm run db:init:local

# Продакшн:
wrangler d1 execute trecker --remote --file=./schema.sql
```

### 4. VAPID-ключи для push-уведомлений (один раз)

```bash
node generate-vapid-keys.js
```

Скрипт выведет ключи. Устанавливаем их как secrets в Cloudflare:

```bash
echo "ПУБЛИЧНЫЙ_КЛЮЧ"       | wrangler secret put VAPID_PUBLIC_KEY
echo "ПРИВАТНЫЙ_КЛЮЧ"       | wrangler secret put VAPID_PRIVATE_KEY
echo "mailto:naziz.kz@gmail.com" | wrangler secret put VAPID_EMAIL
```

Также добавить обязательный секрет сессии (если ещё не задан):

```bash
echo "длинная-случайная-строка" | wrangler secret put SESSION_SECRET
```

### 5. Локальная разработка

```bash
npm run dev   # http://localhost:8787
```

### 6. Деплой в продакшн

```bash
npm run deploy
```

После деплоя в консоли должно быть:

```
Deployed sport triggers
  https://sport.ms-cert.workers.dev
  schedule: 0 3 * * *    ← 8:00 Алматы
  schedule: 0 8 * * *    ← 13:00 Алматы
  schedule: 0 15 * * *   ← 20:00 Алматы
```

---

## Push-уведомления

Уведомления приходят **только если хотя бы одна привычка за день не выполнена**.

| Время (Алматы) | UTC | Заголовок | Текст |
|---|---|---|---|
| 8:00 | 03:00 | 🌅 Герой, доброе утро! | Начни день — отметь первые привычки! |
| 13:00 | 08:00 | 💪 Герой, время обеда! | Привычки сами себя не отметят 😄 |
| 20:00 | 15:00 | 🌙 Герой, добрый вечер! | Последний шанс закрыть день на 100%! |

Для подписки на телефоне: открыть приложение → **Профиль** → **Уведомления** → **Включить**.

---

## Переменные окружения

| Переменная | Где задать | Описание |
|---|---|---|
| `SESSION_SECRET` | `wrangler secret` | Секрет для подписи cookie-сессий |
| `VAPID_PUBLIC_KEY` | `wrangler secret` | Публичный VAPID-ключ (P-256, base64url) |
| `VAPID_PRIVATE_KEY` | `wrangler secret` | Приватный VAPID-ключ |
| `VAPID_EMAIL` | `wrangler secret` | Контактный email для VAPID |
| `GOOGLE_CLIENT_ID` | `wrangler secret` | Google OAuth (опционально) |
| `GOOGLE_CLIENT_SECRET` | `wrangler secret` | Google OAuth (опционально) |
| `TURNSTILE_SITEKEY` | `wrangler secret` | Cloudflare Turnstile (опционально) |
| `TURNSTILE_SECRET` | `wrangler secret` | Cloudflare Turnstile (опционально) |
