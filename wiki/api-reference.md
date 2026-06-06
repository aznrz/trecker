---
title: API Reference
category: Architecture
tags: [api, endpoints]
sources: [_worker.js]
updated: 2026-06-03
---

# API `/api/*`

Все пути ниже — относительно `/api`. Обработка — в [[backend-worker]].

## Конфиг и аутентификация
| Метод | Путь | Назначение |
|---|---|---|
| GET | `/config` | какие фичи включены (для фронта), см. [[feature-flags]] |
| GET | `/auth/google` | старт Google OAuth, см. [[google-oauth]] |
| GET | `/auth/google/callback` | колбэк Google OAuth |
| POST | `/register` | регистрация (email + пароль) |
| POST | `/login` | вход |
| POST | `/logout` | выход |
| GET | `/me` | текущий пользователь |

## Активности и логи
| Метод | Путь | Назначение |
|---|---|---|
| GET | `/activities` | список активностей |
| POST | `/activities` | создать активность |
| PATCH | `/activities/:id` | изменить активность |
| DELETE | `/activities/:id` | удалить активность |
| GET | `/activities/:id/logs` | логи активности |
| POST | `/logs` | добавить лог |
| POST | `/logs/clear` | очистить логи за день |
| PATCH | `/logs/:id` | изменить лог |
| DELETE | `/logs/:id` | удалить лог |
| GET | `/stats` | агрегаты/статистика |

## Gym Mode (упражнения и подходы)
| Метод | Путь | Назначение |
|---|---|---|
| GET | `/exercises` | справочник упражнений пользователя |
| POST | `/exercises` | создать упражнение |
| PATCH | `/exercises/:id` | изменить упражнение |
| DELETE | `/exercises/:id` | удалить упражнение |
| POST | `/workouts` | записать подход(ы) |
| GET | `/workouts/stats` | статистика тренировок |
| GET | `/workouts/day` | подходы за день |
| GET | `/workouts/progress` | прогресс по упражнению |

Детали режима зала — [[gym-mode]]. Таблицы — [[data-model]].
