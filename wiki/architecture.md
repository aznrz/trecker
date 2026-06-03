---
title: Architecture
category: Architecture
tags: [overview, cloudflare, d1]
sources: [_worker.js, public/, schema.sql, wrangler.jsonc]
updated: 2026-06-03
---

# Архитектура

Личный трекер активностей (Habit Tracker) на **Cloudflare Workers + D1**.
Прод: https://trecker.ms-cert.workers.dev

## Слои приложения
- **`_worker.js`** — весь бэкенд: роутер, аутентификация, API. Запросы `/api/*`
  обрабатывает воркер; всё остальное (статика) отдаётся из `public/` через binding `ASSETS`.
  Подробнее — [[backend-worker]], [[api-reference]].
- **`public/`** — фронтенд (ванильный JS, без сборки): `index.html`, `app.js`,
  `style.css`, `manifest.json`, `icon.svg`. См. [[frontend]].
- **D1 (SQLite)** — схема в `schema.sql`. См. [[data-model]], [[migrations]].
- **`wrangler.jsonc`** — конфиг Cloudflare. Worker name `trecker`, D1 binding `DB`,
  статика через binding `ASSETS`.

## Поток запроса
1. Запрос приходит в воркер.
2. `url.pathname.startsWith("/api/")` → роутинг в `_worker.js` (см. [[api-reference]]).
3. Иначе → статика из `public/` через `ASSETS`.

## Структура вики (метод Карпатого)
- **Layer 1 — Raw sources:** код и дизайн (`_worker.js`, `public/`, `schema.sql`, `design/`).
  Неизменяемый источник правды, агент читает но не «переписывает под вики».
- **Layer 2 — Wiki:** каталог `wiki/` (эта папка). Кросс-связанные markdown-страницы,
  каталог [[index]], журнал [[log]].
- **Layer 3 — Schema:** [AGENTS.md](../AGENTS.md) — правила ingest/query/lint и соглашения.

См. также [[deploy]], [[feature-flags]], [[conventions]].
