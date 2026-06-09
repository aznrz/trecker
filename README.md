<div align="center">

# 🏆 Habit Tracker

**PWA для отслеживания ежедневных привычек и тренировок**
Числовые и простые привычки, стрики, календарь, Gym Mode и push-напоминания — на Cloudflare Workers + D1.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![D1](https://img.shields.io/badge/D1-SQLite-003B57?logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](public/manifest.json)
[![Tests](https://img.shields.io/badge/tests-Playwright%20%2B%20Axe-2EAD33?logo=playwright&logoColor=white)](tests/)

**🌐 Прод:** [sport.ms-cert.workers.dev](https://sport.ms-cert.workers.dev)

</div>

> Деплой вручную через `npm run deploy` — Git-автодеплоя нет.

---

## ✨ Возможности

- **Два типа привычек** — числовые (подтягивания, страницы, км) и простые (отметить / не отметить)
- **Дневной дашборд** с прогресс-барами и стриками
- **Быстрый ввод** — кнопки +1, +5, +10 и т.д.
- **Календарь** выполнения за месяц
- **Статистика** с графиками за 7 / 30 дней
- **Gym Mode** — запись тренировок (упражнение, вес, повторы) + аналитика тоннажа и топ-3 упражнений
- **Темы и языки** — светлая / тёмная, русский и английский
- **Push-уведомления** в 8:00, 13:00 и 20:00 по Алматы (только если есть невыполненные привычки)
- **Аутентификация** — email/пароль или Google OAuth

---

## 🧱 Стек

| Слой | Технология |
|---|---|
| Хостинг | Cloudflare Workers |
| База данных | Cloudflare D1 (SQLite) |
| Фронтенд | Vanilla JS SPA, Tailwind CSS |
| Push-уведомления | Web Push API (RFC 8291), VAPID (RFC 8292) |
| Аутентификация | PBKDF2-SHA256, signed cookie, Google OAuth |
| Защита | Cloudflare Turnstile, rate limiting |

---

## 📁 Структура проекта

```
.
├── _worker.js          бэкенд: API, аутентификация, push, cron-хендлер
├── public/             фронтенд (без сборки)
│   ├── index.html        оболочка SPA
│   ├── app.js            весь фронтенд (State → API → Render)
│   ├── sw.js             Service Worker (приём push-уведомлений)
│   ├── style.css         стили (Tailwind + CSS-переменные тем)
│   └── manifest.json     PWA-манифест
├── schema.sql          схема D1: users, activities, logs, exercises, workout_sets, …
├── wrangler.jsonc      конфиг Cloudflare Workers (имя, D1, cron)
├── scripts/            разовые утилиты (generate-vapid-keys.js)
├── docs/               документация по архитектуре и фичам
└── tests/              E2E- и a11y-тесты (Playwright + Axe-core)
```

---

## 📚 Документация

| Документ | О чём |
|---|---|
| [docs/implementation_plan.md](docs/implementation_plan.md) | UI/UX-концепция и архитектура фронтенда: экраны, drill-down активности, достижения |
| [docs/gym-analytics.md](docs/gym-analytics.md) | Gym Mode: схема БД, API тренировок (`/api/workouts*`), дашборды и BI-ready структура |
| [AGENTS.md](AGENTS.md) | Конвенции репозитория и правила для AI-агентов |
| [tests/README.md](tests/README.md) | Запуск E2E- и a11y-тестов |

---

## 🚀 Запуск: с нуля до прода

### 1. Зависимости

```bash
npm install
```

### 2. Локальные переменные окружения

```bash
cp .dev.vars.example .dev.vars
# Заполни SESSION_SECRET и VAPID_* (ключи — см. шаг 4)
```

### 3. Миграция БД

Первый раз или после изменений в `schema.sql`:

```bash
npm run db:init:local                                   # локально (для wrangler dev)
wrangler d1 execute trecker --remote --file=./schema.sql  # продакшн
```

### 4. VAPID-ключи для push (один раз)

```bash
node scripts/generate-vapid-keys.js
```

Скрипт выведет пару ключей — устанавливаем их секретами в Cloudflare:

```bash
echo "ПУБЛИЧНЫЙ_КЛЮЧ"            | wrangler secret put VAPID_PUBLIC_KEY
echo "ПРИВАТНЫЙ_КЛЮЧ"            | wrangler secret put VAPID_PRIVATE_KEY
echo "mailto:you@example.com"    | wrangler secret put VAPID_EMAIL
echo "длинная-случайная-строка"  | wrangler secret put SESSION_SECRET
```

### 5. Локальная разработка

```bash
npm run dev   # http://localhost:8787
```

### 6. Деплой

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

## 🔔 Push-уведомления

Приходят **только если хотя бы одна привычка за день не выполнена**.

| Время (Алматы) | UTC | Заголовок | Текст |
|---|---|---|---|
| 8:00 | 03:00 | 🌅 Герой, доброе утро! | Начни день — отметь первые привычки! |
| 13:00 | 08:00 | 💪 Герой, время обеда! | Привычки сами себя не отметят 😄 |
| 20:00 | 15:00 | 🌙 Герой, добрый вечер! | Последний шанс закрыть день на 100%! |

Подписка на телефоне: **Профиль → Уведомления → Включить**.

---

## ⚙️ Переменные окружения

| Переменная | Где задать | Описание |
|---|---|---|
| `SESSION_SECRET` | `wrangler secret` | Секрет для подписи cookie-сессий **(обязательно)** |
| `VAPID_PUBLIC_KEY` | `wrangler secret` | Публичный VAPID-ключ (P-256, base64url) |
| `VAPID_PRIVATE_KEY` | `wrangler secret` | Приватный VAPID-ключ |
| `VAPID_EMAIL` | `wrangler secret` | Контактный email для VAPID |
| `GOOGLE_CLIENT_ID` | `wrangler secret` | Google OAuth (опционально) |
| `GOOGLE_CLIENT_SECRET` | `wrangler secret` | Google OAuth (опционально) |
| `TURNSTILE_SITEKEY` | `wrangler secret` | Cloudflare Turnstile (опционально) |
| `TURNSTILE_SECRET` | `wrangler secret` | Cloudflare Turnstile (опционально) |
| `E2E` | `.dev.vars` | `1` отключает rate-limit для локальных E2E-тестов (в проде не задавать) |

> 🔒 Секреты задаются только через `wrangler secret put` или дашборд Cloudflare — в репозиторий они не попадают. Локально — в `.dev.vars` (в `.gitignore`).

---

## 📄 Лицензия

[MIT](LICENSE) © [Aziz](https://github.com/aznrz)
