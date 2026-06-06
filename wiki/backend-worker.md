---
title: Backend Worker
category: Architecture
tags: [backend, worker, routing]
sources: [_worker.js]
updated: 2026-06-03
---

# Бэкенд: `_worker.js`

Единственный файл бэкенда. Содержит роутер, middleware аутентификации и все обработчики API.

## Роутинг
- `fetch()` — точка входа. Если `url.pathname.startsWith("/api/")` → передаёт в API-роутер,
  иначе статика отдаётся через `ASSETS` (см. [[architecture]]).
- В API-роутере путь нормализуется: `path = url.pathname.replace(/^\/api/, "")`.
- Эндпоинты матчатся по `path === ...` и `method`; параметризованные пути (`/activities/:id`,
  `/logs/:id`, `/activities/:id/logs`, `/exercises/:id`) — через регэкспы.

## Аутентификация
- Сессионная (cookie), пароли хэшируются. Защищённые эндпоинты получают `uid` после проверки.
- Антибот/частота — rate limiting по IP (таблица `rate_limits`). См. [[auth]].
- Вход через Google — фича-флаг, см. [[google-oauth]].

## Конфиг для фронта
- `GET /api/config` сообщает фронту, какие фичи включены (`googleEnabled`, turnstile и т.п.).
  См. [[feature-flags]].

Полный список эндпоинтов — [[api-reference]]. Модель данных — [[data-model]].
