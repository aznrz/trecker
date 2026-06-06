---
title: Frontend
category: Architecture
tags: [frontend, spa, vanilla-js]
sources: [public/index.html, public/app.js, public/style.css, public/manifest.json]
updated: 2026-06-03
---

# Фронтенд: `public/`

Ванильный SPA без сборки. Отдаётся статикой через binding `ASSETS` (см. [[architecture]]).

## Файлы
- `index.html` — разметка, контейнеры экранов (вход, список целей, детальный экран, модалки).
- `app.js` — состояние и рендер. Ключевые экраны: «Сегодня», детальный экран активности
  (drill-down), «Статистика», «Активности». Работает с API через `fetch` (см. [[api-reference]]).
- `style.css` — стили.
- `manifest.json`, `icon.svg` — PWA-метаданные и иконка.

## Состояние и рендер
- Состояние держится в объекте `state` (включая выбранную активность для drill-down).
- Рендер: список активностей карточками; детальный экран считает Total, Personal Best,
  недельный график, ачивки, последние логи, FAB для быстрого добавления.

## Дизайн
- Референс и план редизайна (Tailwind, Material Symbols, ачивки, FAB) — [[ui-redesign]].
- Исходники дизайна (Layer 1): `design/today-desktop-light.html`, `design/today-desktop-light.png`.

Бэкенд, который кормит фронт данными — [[backend-worker]].
