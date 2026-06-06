---
title: Auth
category: Auth
tags: [sessions, security, rate-limit]
sources: [_worker.js, schema.sql]
updated: 2026-06-03
---

# Аутентификация и доступ

## Пароль + сессия
- Регистрация/вход: `POST /register`, `POST /login`, `POST /logout`, `GET /me` (см. [[api-reference]]).
- Пароли хранятся как `pass_hash` в таблице `users` (см. [[data-model]]).
- Сессия — через cookie; защищённые эндпоинты получают `uid` после проверки.

## Rate limiting
- Ограничение частоты запросов по IP через таблицу `rate_limits`
  (`k = "<scope>:<ip>"`, `cnt`, `win` = начало окна в unix-секундах).
- Опционально — Cloudflare Turnstile (антибот) как фича-флаг, см. [[feature-flags]].

## Google OAuth
Вход через Google — отдельная страница [[google-oauth]] (тоже фича-флаг).

## Безопасность
Соглашения по секретам и необратимым действиям — [[conventions]].
