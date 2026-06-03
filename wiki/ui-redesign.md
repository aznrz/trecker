---
title: UI Redesign
category: Design
tags: [ui, design, plan, tailwind]
sources: [implementation_plan.md, design/today-desktop-light.html, design/today-desktop-light.png]
updated: 2026-06-03
---

# План премиального фитнес-дизайна

Интеграция референса страницы активности (сводка, недельный график, ачивки, история логов,
плавающая кнопка FAB, современная палитра, Material Symbols) во всё приложение с сохранением
поддержки нескольких активностей. Исходник плана — [implementation_plan.md](../implementation_plan.md).
Референс (Layer 1): `design/today-desktop-light.{html,png}`.

## Концепция UI/UX
- **Стек:** Tailwind CSS (CDN), шрифт Inter, иконки Material Symbols Outlined.
- **Вкладка «Сегодня»:** активности карточками с прогресс-барами; клик → детальный экран.
- **Детальный экран (drill-down):** hero-блок (Total, сегодня, Personal Best, Streak),
  интерактивный недельный график, ачивки (бронза/серебро/золото), последние логи с удалением, FAB.
- **Вкладка «Статистика»:** агрегаты по всем привычкам за 7/30 дней.
- **Вкладка «Активности»:** управление списком, цели, цвета.

## Затрагиваемые файлы
- `public/index.html` — Tailwind, контейнеры экранов, единый Toast.
- `public/app.js` — `state.selectedActivityId`, расчёт Total/Personal Best/недельного графика,
  отрисовка ачивок и логов, премиальные модалки.

Реализация фронта — [[frontend]]. Источник данных для экранов — [[api-reference]].

## Логика ачивок (из плана)
- Бронза: общая сумма > 0.
- Серебро: streak ≥ 3.
- Золото: общая сумма ≥ 500 (или 10× дневной цели).
