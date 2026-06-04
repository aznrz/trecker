# QA E2E & UI/UX Test Checklist - Trecker

> Инструкция запуска для второго бота:
> 1. Создать `.dev.vars` в корне: `SESSION_SECRET=local-dev-secret-change-me` (Turnstile/Google НЕ задавать → капча и OAuth выключены).
> 2. `npm install` → `npx playwright install chromium`.
> 3. Локальный прогон: `npm test` (webServer сам поднимет `wrangler dev` на `http://127.0.0.1:8787` с инициализацией локальной D1).
> 4. Против прода (только read-only спеки): `set BASE_URL=https://sport.ms-cert.workers.dev && npx playwright test tests/page-health.spec.js tests/a11y.spec.js`.
> 5. Отчёт: `npm run test:report` (HTML в `playwright-report/`), скриншоты упавших — в `test-results/`.
> Severity: **P0** блокер (релиз нельзя) · **P1** важный · **P2** косметика/мелочь.

### 1. Здоровье страницы — `tests/page-health.spec.js`

| ID | Вопрос (работает ли?) | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| PH-01 | Грузится ли страница без ошибок JS? | Открыть `/`, слушать `pageerror`/`console.error` | Нет необработанных ошибок и `console.error` | — | P0 |
| PH-02 | Нет ли битых ресурсов (404)? | Перехватить `response`, дождаться `networkidle` | Нет статусов ≥400 на статику и `/api/config` | `/style.css`, `/app.js`, `/icon.svg`, `/manifest.json` | P1 |
| PH-03 | Корректны ли `<title>`, `lang`, viewport, manifest? | Прочитать `<head>` | `title="Habit Tracker"`, `html[lang]`, `meta[name=viewport]`, `link[rel=manifest]` присутствуют | `head` | P2 |
| PH-04 | Грузится ли иконка/манифест? | GET `/icon.svg` и `/manifest.json` | Оба отдают 200 | — | P2 |
| PH-05 | Переключается ли тема и сохраняется? | Залогиниться, кликнуть `#themeToggleSide` | `<html>` получает/снимает класс `dark`; `localStorage['antigravity-theme']` меняется | `#themeToggleSide`, `html` | P1 |
| PH-06 | Переключается ли язык EN/RU? | Profile → тумблер языка | Тексты `[data-i18n]` меняются; `localStorage['antigravity-lang']` = `ru`/`en` | `[data-tab="profile"]` | P1 |

### 2. Авторизация — `tests/auth.spec.js`

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| AU-01 | Видит ли гость экран логина? | Открыть `/` без сессии | `#auth` видим, `#app` скрыт | `#auth`, `#app` | P0 |
| AU-02 | Переключаются ли вкладки Sign In / Sign Up? | Клик по табам | Активный таб подсвечивается, текст кнопки submit меняется | `[data-action="login-tab"]`, `[data-action="register-tab"]`, `#authSubmitBtn` | P1 |
| AU-03 | Регистрируется ли новый пользователь? | Уникальный email + пароль ≥6, submit | Переход в `#app`, `#userEmail` = введённый email | `#emailInput`, `#passwordInput`, `#authSubmitBtn`, `#userEmail` | P0 |
| AU-04 | Работает ли логин существующего? | Зарегать через API, залогиниться через форму | Попадание в `#app` | те же | P0 |
| AU-05 | Работает ли логаут? | В `#app` кликнуть `#logoutBtn` | Возврат на `#auth` | `#logoutBtn`, `#auth` | P0 |
| AU-06 | Показывается ли ошибка при неверном пароле? | Логин с чужим/неверным паролем | Текст в `#authError`, остаёмся на `#auth` | `#authError` | P1 |
| AU-07 | Валидируются ли пустые/короткие поля? | Submit с пустым email / паролем <6 | Браузерная валидация (`required`, `minlength=6`) не пускает | `#emailInput`, `#passwordInput` | P2 |

### 3. Навигация и адаптивность — `tests/navigation-responsive.spec.js` (оба проекта: desktop + mobile)

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| NV-01 | Правильная ли навигация на desktop? | Вьюпорт 1280×800, залогинен | `.sidebar` видим, `.bottom-bar` скрыт | `.sidebar`, `.bottom-bar` | P1 |
| NV-02 | Правильная ли навигация на mobile? | Вьюпорт 390×844 | `.bottom-bar` видим, `.sidebar` скрыт | те же | P1 |
| NV-03 | Переключаются ли все 4 таба? | Клик `today→calendar→stats→profile` | `#view` перерисовывается, активный таб получает `.active` | `[data-tab="..."]`, `#view` | P0 |
| NV-04 | Открывается/закрывается ли модалка привычки? | Profile → Add; затем Cancel и клик по оверлею | `#activityModal` показывается и скрывается (`.hidden`) | `#activityModal`, `#cancelModalBtn`, `#closeModalBtn` | P1 |
| NV-05 | Открывается ли Gym Mode? | Клик `#gymModeBtnSide` (desktop) / `#gymModeBtnBar` (mobile) | `#gymModal` без класса `hidden` | `#gymModeBtnSide`, `#gymModeBtnBar`, `#gymModal` | P1 |
| NV-06 | Нет ли горизонтального скролла? | На каждом табе и вьюпорте | `document.documentElement.scrollWidth <= clientWidth` | — | P1 |
| NV-07 | Работает ли модалка мотивации (колокольчик)? | Клик `#notifBtnSide`/`#notifBtn` → OK | `#notifModal` открывается, `#notifOkBtn` закрывает | `#notifBtnSide`, `#notifModal`, `#notifOkBtn` | P2 |

### 4. Функциональные E2E: привычки — `tests/habits.spec.js` (authed)

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| HB-01 | Создаётся ли привычка? | Add → `#actNameInput`, тип numeric, `#actGoalInput`, Save | Карточка появляется в Today | `#activityForm`, `#actNameInput`, `[data-type="numeric"]`, `#actGoalInput`, `#saveActivityBtn` | P0 |
| HB-02 | Логируется ли значение и растёт ли прогресс? | На карточке quick-add или `#logModal` | Прогресс-бар/проценты обновляются | `.card-grid`, `#logModal`, `#logAmountInput` | P0 |
| HB-03 | Открывается ли детальная карточка? | Клик по карточке привычки | Виден экран деталей (статы/график/логи) | `.card-grid .glass-panel` | P1 |
| HB-04 | Редактируется/удаляется ли лог? | В деталях изменить и удалить запись | Запись меняется/исчезает, подтверждение удаления | edit/delete на записи лога | P1 |
| HB-05 | Редактируется/удаляется ли привычка? | Profile → Edit → изменить; затем Delete | Изменения сохраняются; привычка удаляется | `#activityIdInput`, `#deleteActivityBtn` | P1 |
| HB-06 | Работает ли простой тип (Simple)? | Создать привычку `data-type="simple"` | Числовые поля скрыты (`#numericFields`), отметка «сделано» | `[data-type="simple"]`, `#numericFields` | P2 |

### 5. Функциональные E2E: Gym Mode — `tests/gym.spec.js` (authed)

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| GY-01 | Сидируются ли упражнения по умолчанию? | Открыть `#gymModal` | `#gymExerciseSelect` непустой (8 дефолтов) | `#gymExerciseSelect` | P1 |
| GY-02 | Добавляется ли сет? | Выбрать упражнение, вес/повторы, `#gymAddSetBtn` | `#gymSetList` растёт, счётчик `#gymSetCount` увеличивается | `#gymWeightInput`, `#gymRepsInput`, `#gymAddSetBtn`, `#gymSetList` | P0 |
| GY-03 | Добавляются ли несколько сетов сразу? | `#gymSetsInput`=3, Add | В список добавляется 3 сета; лейбл `#gymAddSetLabel` отражает кол-во | `#gymSetsInput`, `#gymAddSetLabel` | P2 |
| GY-04 | Сохраняется ли тренировка? | `#gymFinishBtn` | Модалка закрывается, данные сохранены (`POST /api/workouts`) | `#gymFinishBtn` | P0 |
| GY-05 | Отражается ли тренировка в Stats (gym)? | Stats → режим Gym | Появляются тоннаж/калории/распределение по мышцам | `[data-tab="stats"]` | P1 |
| GY-06 | Работает ли менеджер упражнений? | `#gymManageBtn` → создать новое (`#exNameInput`, `#exMuscleSelect`) → Save | Новое упражнение появляется в `#exList` и в `#gymExerciseSelect` | `#gymManageBtn`, `#exNameInput`, `#exSaveBtn`, `#exList` | P2 |

### 7. Аналитический календарь — `tests/calendar.spec.js` (authed)

> Сид: при регистрации авто-сеются дефолтные привычки — тест их удаляет, затем создаёт `Pushups` (цель 5) и `Squats` (цель 3) и логирует: сегодня обе на цель (идеальный день), `today-1` только A, `today-2` B ниже цели.

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| CAL-01 | Рисуется ли сетка и навигация по месяцам? | Открыть Calendar | Видны `.cal-grid` и кнопки ‹ / › | `.cal-grid`, `[data-nav="-1"]`, `[data-nav="1"]` | P0 |
| CAL-02 | Подсвечивается ли идеальный день? | День, где все привычки на цель | Ячейка получает класс `cal-cell--perfect` (золотая рамка) | `.cal-cell--perfect` | P1 |
| CAL-03 | Появляются ли чипы-фильтры? | — | «Все» + по чипу на привычку (здесь 3) | `.cal-chip` | P1 |
| CAL-04 | Работает ли heatmap-фон? | — | ≥1 ячейка с инлайновым `background` по доле выполнения | `.cal-cell[style*="background"]` | P1 |
| CAL-05 | Открываются ли детали дня? | Клик по активному дню | Панель с бейджем идеального дня и строкой на каждую привычку | `.cal-day-detail`, `.cal-perfect-badge`, `.cal-detail-row` | P0 |
| CAL-06 | Фильтруется ли календарь по привычке? | Клик по чипу привычки | Чип становится активным, фон ячеек — по этой привычке | `.cal-chip--active` | P1 |
| CAL-07 | Работает ли навигация ‹ › и «Сегодня»? | ‹ на прошлый месяц, затем «Сегодня» | Вне текущего месяца видна `.cal-today-btn`; клик возвращает и скрывает её | `[data-nav="-1"]`, `.cal-today-btn` | P1 |
| CAL-08 | Считается ли инсайт по дням недели? | — | Блок с 7 столбцами + «сильнее/слабее всего» | `.cal-weekday-bars`, `.cal-wd` | P2 |
| CAL-09 | Рисуется ли годовой heatmap (ленивый)? | Клик «Показать год» | Сетка `.cal-year` с ≥360 ячейками | `.cal-year-toggle`, `.cal-year`, `.cal-year__cell` | P2 |
| CAL-10 | Нет ли ошибок страницы за сценарий? | Слушать `pageerror` весь тест | Массив ошибок пуст | — | P0 |

### 6. Доступность (a11y) — `tests/a11y.spec.js` (axe-core)

| ID | Вопрос | Шаги | Ожидаемый результат | Селекторы | Severity |
|----|----|----|----|----|----|
| AX-01 | Чист ли по axe экран логина? | `AxeBuilder` на `#auth` | Нет critical/serious нарушений | `#auth` | P1 |
| AX-02 | Чист ли по axe Today? | `AxeBuilder` на залогиненном Today | Нет critical/serious | `#view` | P1 |
| AX-03 | Чист ли по axe Profile? | `AxeBuilder` на Profile | Нет critical/serious | `[data-tab="profile"]` | P2 |
| AX-04 | Чиста ли по axe открытая модалка привычки? | Открыть `#activityModal`, прогон axe | Нет critical/serious | `#activityModal` | P2 |
| AX-05 | Есть ли у инпутов программные labels? | Проверить `label[for]`/`aria-label` у полей | Все поля имеют доступное имя | формы | P1 |
| AX-06 | Есть ли у иконочных кнопок доступное имя? | Проверить `title`/`aria-label` | `.icon-btn` имеют имя | `.icon-btn` | P2 |
| AX-07 | Работает ли клавиатура? | Tab по форме логина, Esc на модалке | Фокус по порядку; Esc закрывает модалку | `#authForm`, `#activityModal` | P2 |

### Шаблон отчёта второго бота
Для каждого ID укажите: `PASS / FAIL / SKIP` + (при FAIL) ссылка на скриншот/трейс из `test-results/` и краткое описание расхождения.
Свод по severity: число FAIL по P0/P1/P2.
На проде кейсы группы 4–5 (мутации) и AU-03/04 помечать `SKIP` (включена Turnstile).
