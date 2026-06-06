/**
 * Habit Tracker — трекер привычек (SPA, light/dark темы через CSS-переменные)
 * Архитектура: State → API → Render. Бэкенд и эндпоинты без изменений.
 */

// ==========================================
// 1. STATE
// ==========================================
const state = {
  user: null,
  activities: [],
  activeTab: 'today',
  selectedActivityId: null,
  statsDays: 30,
  statsPeriod: 7,
  statsMode: 'habits', // 'habits' | 'gym' — режим вкладки Stats
  selectedColor: '#0059b5',
  gymSets: [], // подходы текущей тренировки (Gym Mode)
  gymExercises: [], // справочник упражнений с дефолтами (кэш из /api/exercises)
  gymStatsExerciseId: null, // выбранное упражнение для графика прогресса
  gymCalDate: null, // выбранный день в календаре тренировок
  calMonth: null, // 'YYYY-MM' — отображаемый месяц в календаре привычек
  calHabitFilter: null, // null = все привычки, либо activity.id для фокуса на одной
  calShowYear: false, // показан ли годовой heatmap
  lang: (() => {
    try {
      return localStorage.getItem('antigravity-lang') || (navigator.language.startsWith('ru') ? 'ru' : 'en');
    } catch (e) {
      return 'en';
    }
  })(),
};

// Палитра, читаемая на светлом фоне
const COLOR_PRESETS = [
  '#0059b5', // Blue (primary)
  '#006e1c', // Green
  '#8c21c0', // Purple
  '#ba1a1a', // Red
  '#c2410c', // Orange
  '#0e7490', // Cyan
  '#be185d', // Pink
  '#4338ca', // Indigo
];

// Emojis for picker
const EMOJI_PRESETS = [
  // Спорт и движение
  '💪', '🏃', '🚴', '🧘', '🏋️', '🏊', '🚶', '🧗', '🥊', '⚽', '🏀', '🎾', '🏐', '🏇', '🤸', '🎿', '🛹', '🥋',
  // Еда и питьё
  '🍎', '🍏', '🥦', '🥗', '🍵', '☕', '🚰', '💧', '🧃', '🍋', '🥤', '🫖', '🚭',
  // Учёба и работа
  '📖', '📚', '💻', '✍️', '🧠', '📝', '🎓', '🔬', '📐', '🗂️', '📊', '🖊️',
  // Здоровье и режим
  '💤', '⏰', '🧼', '🪥', '🛁', '❤️', '🩺', '💊', '🧘',
  // Деньги и продуктивность
  '💵', '💰', '📈', '🎯', '✅', '🔥',
  // Дом и хобби
  '🧹', '🌱', '🌿', '🎨', '🎵', '🎮', '🎸', '🎬', '📸', '✨', '🕯️', '🌞', '🌙',
];

const TRANSLATIONS = {
  en: {
    // Nav
    today: 'Today',
    calendar: 'Calendar',
    stats: 'Stats',
    profile: 'Profile',
    gym_mode: 'Gym Mode',
    sign_out: 'Sign out',
    motivation: "Today's motivation",
    
    // Auth
    auth_subtitle: 'Track your habits. Perfect your routine.',
    sign_in: 'SIGN IN',
    sign_up: 'SIGN UP',
    email: 'Email',
    password: 'Password',
    or: 'or',
    sign_in_google: 'Sign in with Google',
    confirm_robot: 'Please confirm you are not a robot',
    session_expired: 'Session expired, please sign in again',
    welcome_back: 'Welcome back!',
    account_created: 'Account created!',
    auth_failed: 'Sign in / sign up error',
    email_placeholder: 'name@domain.com',
    password_placeholder: 'At least 6 characters',
    google_failed: 'Google sign-in failed, please try again',

    // Dashboard
    hi_hero: 'Hi, Hero!',
    ready_ascend: 'Ready to ascend today?',
    daily_momentum: 'Daily Momentum',
    goals_left: 'Goals left today: {n}',
    all_goals_done: "All goals done! You're weightless 🚀",
    ascended: 'Ascended',
    streak: '{n} Day Streak',
    done_today: 'Done today',
    mark_done: 'Mark Done',
    reset_today: '↺ Reset today',
    log: 'Log',
    done: 'Done',
    reset_confirm: 'Reset today\'s entries for "{name}"? This cannot be undone.',
    reset_toast: "Today's entries were reset",
    no_habits: 'No habits yet',
    add_first_goal: 'Add your first goal in the Profile tab.',
    added_toast: 'Added +{amount} {unit}',
    failed_log_toast: 'Failed to save log',
    failed_reset_toast: 'Failed to reset',
    goal_reached_toast: 'Goal already reached 🎉',
    enter_number_toast: 'Enter a number',

    // Habit Details
    days_done: 'DAYS DONE',
    total_unit: 'Total {unit}',
    today_label: 'Today',
    best_label: 'Best',
    streak_label: 'Streak',
    weekly_progress: 'Weekly Progress',
    days_count: '7 days',
    achievements: 'Achievements',
    recent_activity: 'Recent Activity',
    loading_logs: 'Loading logs...',
    no_entries: 'No entries recently',
    check_in: 'Check-in',
    amount_logged: 'Amount logged',
    edit_entry: 'Edit entry',
    delete_entry: 'Delete entry',
    delete_entry_confirm: 'Delete this entry?',
    entry_deleted: 'Entry deleted',
    entry_updated: 'Entry updated',
    failed_delete_entry: 'Failed to delete entry',
    failed_update_entry: 'Failed to update entry',
    edit_amount_prompt: 'Edit amount for {date}:',
    positive_number_toast: 'Please enter a positive number',
    failed_load_details: 'Failed to load details',
    activity_not_found: 'Activity not found',

    // Profile
    settings_habits: 'Settings & habits',
    dark_theme: 'Dark theme',
    appearance_sub: 'Light / dark appearance',
    language_label: 'Language',
    language_sub: 'Russian / English UI',
    my_habits: 'My Habits',
    add_btn: 'Add',
    edit_btn: 'Edit',
    goal_label: 'Goal: {goal} {unit}',
    no_habits_profile: 'No habits',
    add_first_habit: 'Add your first habit now.',
    failed_load_habits: 'Failed to load habits',
    theme_switch_aria: 'Toggle theme',
    sign_out_confirm: 'Sign out of your account?',
    signed_out_toast: 'Signed out',
    failed_sign_out: 'Failed to sign out',

    // Calendar
    calendar_title: 'Calendar',
    completed_habits_sub: 'Days with completed habits',
    legend: 'Cell brightness = share of habits done that day. Dots show which habits.',
    failed_load_calendar: 'Failed to load calendar',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekdays_short: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    cal_today_btn: 'Today',
    cal_filter_all: 'All',
    cal_summary: '{active} active days · {rate}% done · {perfect} perfect · best streak {streak}',
    cal_tap_hint: 'Tap a day to see details.',
    cal_day_detail_title: 'Habits on {date}',
    cal_habits_done: '{n} of {m} habits',
    cal_goal_met: 'goal ✓',
    cal_goal_miss: 'in progress',
    cal_no_activity: 'No activity this day.',
    cal_perfect_day: 'Perfect day 🏆',
    cal_weekday_insight: 'Consistency by weekday',
    cal_best_day: 'Strongest: {d}',
    cal_worst_day: 'Weakest: {d}',
    cal_year_heatmap: 'Year overview',
    cal_show_year: 'Show year',
    cal_hide_year: 'Hide year',
    cal_less: 'less',
    cal_more: 'more',
    cal_year_tip: '{date}: {n} of {m} habits',

    // Stats
    stats_title: 'Stats',
    habit_dynamics_sub: 'Habit dynamics',
    gym_analytics_sub: 'Gym analytics',
    days_btn: '{n} days',
    failed_load_stats: 'Failed to load stats',
    no_stats_data: 'No data',
    log_habits_stats: 'Log habits to see analytics.',
    completed_in_period: 'Completed in {period} days: {days} {daysLabel}',
    total_over_period: 'Total over {period} days: {total} {unit}',
    day_unit: 'day',
    days_unit: 'days',

    // Gym Mode
    workout: 'Workout',
    exercise: 'EXERCISE',
    weight: 'WEIGHT (KG)',
    reps: 'REPS',
    add_set: 'Add Set',
    sets_label: 'SETS',
    no_sets: 'No sets yet. Add your first one.',
    finish_workout: 'Finish Workout',
    enter_weight_reps: 'Enter weight and reps',
    workout_saved: 'Workout saved: {n} sets 💪',
    failed_save_workout: 'Failed to save workout',
    add_set_first: 'Add at least one set to finish the workout',
    tonnage_label: 'Total Tonnage · {period}',
    kg_lifted: 'kg lifted',
    top_exercises: 'Top 3 exercises by volume',
    volume_label: 'Volume',
    max_label: 'Max',
    est_1rm_label: 'Est 1RM',
    sets_reps_total: '{sets} sets · {reps} reps total',
    no_workouts_yet: 'No workouts yet',
    finish_workout_analytics: 'Finish a workout in Gym Mode to see analytics.',
    failed_load_gym: 'Failed to load gym stats',
    calories: 'CALORIES (KCAL)',
    manage_exercises: 'Manage',
    add_exercise: 'NEW EXERCISE',
    exercise_name_ph: 'Exercise name',
    def_weight_ph: 'kg',
    def_reps_ph: 'reps',
    def_sets_ph: 'sets',
    def_calories_ph: 'kcal',
    save: 'SAVE',
    exercise_saved: 'Exercise saved',
    exercise_name_required: 'Enter an exercise name',
    failed_save_exercise: 'Failed to save exercise',
    failed_load_exercises: 'Failed to load exercises',
    edit_exercise: 'EDIT EXERCISE',
    new_exercise_btn: 'New',
    add_n_sets: 'Add {n} sets',
    muscle_group_label: 'MUSCLE GROUP',
    muscle_distribution: 'Muscle Group Distribution',
    muscle_distribution_sub: 'Sets per muscle group · last 30 days',
    sets_count: '{n} sets',
    kcal_burned: 'kcal burned',
    workout_calendar: 'Workout Calendar',
    weight_progress: 'Weight Progress',
    sets_on_day: 'Sets on {date}',
    no_sets_on_day: 'No sets on this day',
    tap_day_hint: 'Tap a highlighted day to see its sets',
    no_progress_data: 'Not enough data for a chart yet',
    period_days: 'last {n} days',

    // Modals
    new_habit: 'New Habit',
    edit_habit: 'Edit Habit',
    name: 'NAME',
    habit_type: 'HABIT TYPE',
    numeric_type: '📊 Numeric',
    simple_type: '✓ Simple',
    unit_label: 'UNIT',
    daily_goal: 'DAILY GOAL',
    quick_add_buttons: 'QUICK ADD BUTTONS',
    quick_add_sub: 'Empty fields are hidden on the card.',
    track_calories: 'TRACK CALORIES',
    calorie_direction: 'DIRECTION',
    calorie_burned: 'Burned',
    calorie_saved: 'Saved',
    calories_per_unit: 'KCAL PER UNIT',
    calories_hint: 'Per one execution; for numeric habits it scales with the amount.',
    calories_widget_title: 'CALORIES',
    body_metrics: 'Body metrics',
    weight_kg_label: 'WEIGHT (KG)',
    height_cm_label: 'HEIGHT (CM)',
    body_saved: 'Body metrics saved',
    failed_save_body: 'Failed to save body metrics',
    color_label: 'COLOR',
    emoji_label: 'EMOJI',
    delete_btn: 'DELETE',
    cancel_btn: 'CANCEL',
    save_btn: 'SAVE',
    name_placeholder: 'e.g. 💪 Pull-ups, 🧘 Meditation',
    habit_delete_confirm: 'Delete this habit permanently?',
    habit_deleted_toast: 'Habit deleted',
    failed_delete_habit: 'Failed to delete',
    failed_save_habit: 'Failed to save',
    habit_updated_toast: 'Habit updated!',
    habit_added_toast: 'Habit added!',
    
    add_log_title: 'Add Log',
    activity_select: 'ACTIVITY',
    amount_label: 'AMOUNT',
    amount_placeholder: 'Enter a number...',
    log_added_toast: 'Log added!',
    create_habit_first: 'Create a habit first',

    // Motivation
    lets_go: "Let's go 🚀",

    // Notifications
    notifications: 'Notifications',
    notif_sub: 'Almaty: 8:00, 13:00, 20:00 — if no habits logged',
    notif_enable: 'Enable',
    notif_disable: 'Disable',
    notif_enabled: 'Notifications enabled!',
    notif_disabled: 'Notifications disabled',
    notif_not_supported: 'Not supported',
    notif_denied: 'Blocked in browser settings',
    notif_error: 'Failed to enable notifications',

    // Health Sync
    health_sync: 'Health Sync',
    health_sync_sub: 'Tasker + Health Connect (Android)',
    generate_token: 'Generate Token',
    regenerate_token: 'Regenerate',
    regenerate_confirm: 'Generate a new token? The old one will stop working.',
    token_copied: 'Token copied!',
    token_copy_error: 'Could not copy — copy manually',
    token_regenerated: 'New token generated',
    token_error: 'Failed to generate token',
    tasker_instruction: '<b>Setup:</b> Install Tasker + <i>Health Connect for Tasker</i> plugin. Create a daily profile that reads steps, then add HTTP POST action:<br><b>URL:</b> <code>{url}/api/ingest</code><br><b>Header:</b> <code>Authorization: Bearer &lt;token&gt;</code><br><b>Body:</b> <code>{"steps": %hcsteps, "date": "%DATE"}</code>',
  },
  ru: {
    // Nav
    today: 'Сегодня',
    calendar: 'Календарь',
    stats: 'Статистика',
    profile: 'Профиль',
    gym_mode: 'Зал',
    sign_out: 'Выйти',
    motivation: 'Мотивация на сегодня',
    
    // Auth
    auth_subtitle: 'Отслеживайте свои привычки. Совершенствуйте свой распорядок.',
    sign_in: 'ВОЙТИ',
    sign_up: 'РЕГИСТРАЦИЯ',
    email: 'Эл. почта',
    password: 'Пароль',
    or: 'или',
    sign_in_google: 'Войти через Google',
    confirm_robot: 'Подтвердите, что вы не робот',
    session_expired: 'Сессия истекла, пожалуйста, войдите снова',
    welcome_back: 'С возвращением!',
    account_created: 'Аккаунт создан!',
    auth_failed: 'Ошибка входа / регистрации',
    email_placeholder: 'name@domain.com',
    password_placeholder: 'Минимум 6 символов',
    google_failed: 'Вход через Google не удался, попробуйте еще раз',

    // Dashboard
    hi_hero: 'Привет, Герой!',
    ready_ascend: 'Готов стать лучше сегодня?',
    daily_momentum: 'Дневной прогресс',
    goals_left: 'Осталось целей на сегодня: {n}',
    all_goals_done: 'Все цели выполнены! Вы на высоте 🚀',
    ascended: 'Выполнено',
    streak: 'Стрик: {n} дн.',
    done_today: 'Выполнено сегодня',
    mark_done: 'Отметить выполненным',
    reset_today: '↺ Сбросить сегодня',
    log: 'Записать',
    done: 'Готово',
    reset_confirm: 'Сбросить сегодняшние записи для "{name}"? Это действие нельзя отменить.',
    reset_toast: 'Сегодняшние записи сброшены',
    no_habits: 'Нет привычек',
    add_first_goal: 'Добавьте свою первую цель во вкладке Профиль.',
    added_toast: 'Добавлено +{amount} {unit}',
    failed_log_toast: 'Не удалось сохранить запись',
    failed_reset_toast: 'Не удалось сбросить',
    goal_reached_toast: 'Цель уже достигнута 🎉',
    enter_number_toast: 'Введите число',

    // Habit Details
    days_done: 'ДНЕЙ ВЫПОЛНЕНО',
    total_unit: 'Всего {unit}',
    today_label: 'Сегодня',
    best_label: 'Лучшее',
    streak_label: 'Стрик',
    weekly_progress: 'Прогресс за неделю',
    days_count: '7 дней',
    achievements: 'Достижения',
    recent_activity: 'Последняя активность',
    loading_logs: 'Загрузка записей...',
    no_entries: 'Нет записей за последнее время',
    check_in: 'Отметка',
    amount_logged: 'Записано',
    edit_entry: 'Редактировать запись',
    delete_entry: 'Удалить запись',
    delete_entry_confirm: 'Удалить эту запись?',
    entry_deleted: 'Запись удалена',
    entry_updated: 'Запись обновлена',
    failed_delete_entry: 'Не удалось удалить запись',
    failed_update_entry: 'Не удалось обновить запись',
    edit_amount_prompt: 'Редактировать количество для {date}:',
    positive_number_toast: 'Пожалуйста, введите положительное число',
    failed_load_details: 'Не удалось загрузить детали',
    activity_not_found: 'Привычка не найдена',

    // Profile
    settings_habits: 'Настройки и привычки',
    dark_theme: 'Тёмная тема',
    appearance_sub: 'Светлое / тёмное оформление',
    language_label: 'Язык',
    language_sub: 'Русский / Английский интерфейс',
    my_habits: 'Мои привычки',
    add_btn: 'Добавить',
    edit_btn: 'Редактировать',
    goal_label: 'Цель: {goal} {unit}',
    no_habits_profile: 'Нет привычек',
    add_first_habit: 'Добавьте свою первую привычку.',
    failed_load_habits: 'Не удалось загрузить привычки',
    theme_switch_aria: 'Переключить тему',
    sign_out_confirm: 'Выйти из аккаунта?',
    signed_out_toast: 'Вы вышли из системы',
    failed_sign_out: 'Не удалось выйти',

    // Calendar
    calendar_title: 'Календарь',
    completed_habits_sub: 'Дни с выполненными привычками',
    legend: 'Яркость ячейки — доля выполненных привычек за день. Точки — какие именно.',
    failed_load_calendar: 'Не удалось загрузить календарь',
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    weekdays_short: ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'],
    cal_today_btn: 'Сегодня',
    cal_filter_all: 'Все',
    cal_summary: '{active} актив. дней · {rate}% выполнено · {perfect} идеальных · стрик {streak}',
    cal_tap_hint: 'Нажмите на день, чтобы увидеть детали.',
    cal_day_detail_title: 'Привычки за {date}',
    cal_habits_done: '{n} из {m} привычек',
    cal_goal_met: 'цель ✓',
    cal_goal_miss: 'в процессе',
    cal_no_activity: 'В этот день активности не было.',
    cal_perfect_day: 'Идеальный день 🏆',
    cal_weekday_insight: 'Стабильность по дням недели',
    cal_best_day: 'Сильнее всего: {d}',
    cal_worst_day: 'Слабее всего: {d}',
    cal_year_heatmap: 'Обзор года',
    cal_show_year: 'Показать год',
    cal_hide_year: 'Скрыть год',
    cal_less: 'меньше',
    cal_more: 'больше',
    cal_year_tip: '{date}: {n} из {m} привычек',

    // Stats
    stats_title: 'Статистика',
    habit_dynamics_sub: 'Динамика привычек',
    gym_analytics_sub: 'Аналитика зала',
    days_btn: '{n} дн.',
    failed_load_stats: 'Не удалось загрузить статистику',
    no_stats_data: 'Нет данных',
    log_habits_stats: 'Записывайте привычки, чтобы увидеть аналитику.',
    completed_in_period: 'Выполнено за {period} дн.: {days} {daysLabel}',
    total_over_period: 'Всего за {period} дн.: {total} {unit}',
    day_unit: 'день',
    days_unit: 'дней',

    // Gym Mode
    workout: 'Тренировка',
    exercise: 'УПРАЖНЕНИЕ',
    weight: 'ВЕС (КГ)',
    reps: 'ПОВТОРЫ',
    add_set: 'Добавить подход',
    sets_label: 'ПОДХОДЫ',
    no_sets: 'Нет подходов. Добавьте первый.',
    finish_workout: 'Завершить тренировку',
    enter_weight_reps: 'Введите вес и повторения',
    workout_saved: 'Тренировка сохранена: {n} подходов 💪',
    failed_save_workout: 'Не удалось сохранить тренировку',
    add_set_first: 'Добавьте хотя бы один подход, чтобы завершить тренировку',
    tonnage_label: 'Общий тоннаж · {period}',
    kg_lifted: 'кг поднято',
    top_exercises: 'Топ-3 упражнения по объему',
    volume_label: 'Объем',
    max_label: 'Максимум',
    est_1rm_label: 'Эст. 1ПМ',
    sets_reps_total: '{sets} подх. · {reps} повт. всего',
    no_workouts_yet: 'Нет тренировок',
    finish_workout_analytics: 'Завершите тренировку в режиме Зал, чтобы увидеть аналитику.',
    failed_load_gym: 'Не удалось загрузить статистику зала',
    calories: 'КАЛОРИИ (ККАЛ)',
    manage_exercises: 'Управление',
    add_exercise: 'НОВОЕ УПРАЖНЕНИЕ',
    exercise_name_ph: 'Название упражнения',
    def_weight_ph: 'кг',
    def_reps_ph: 'повт.',
    def_sets_ph: 'подх.',
    def_calories_ph: 'ккал',
    save: 'СОХРАНИТЬ',
    exercise_saved: 'Упражнение сохранено',
    exercise_name_required: 'Введите название упражнения',
    failed_save_exercise: 'Не удалось сохранить упражнение',
    failed_load_exercises: 'Не удалось загрузить упражнения',
    edit_exercise: 'РЕДАКТИРОВАТЬ',
    new_exercise_btn: 'Новое',
    add_n_sets: 'Добавить подходов: {n}',
    muscle_group_label: 'ГРУППА МЫШЦ',
    muscle_distribution: 'Распределение по группам мышц',
    muscle_distribution_sub: 'Подходы по группам · за 30 дней',
    sets_count: 'Подходов: {n}',
    kcal_burned: 'ккал сожжено',
    workout_calendar: 'Календарь тренировок',
    weight_progress: 'Прогресс весов',
    sets_on_day: 'Подходы за {date}',
    no_sets_on_day: 'Нет подходов в этот день',
    tap_day_hint: 'Нажмите на выделенный день, чтобы увидеть подходы',
    no_progress_data: 'Пока недостаточно данных для графика',
    period_days: 'за {n} дн.',

    // Modals
    new_habit: 'Новая привычка',
    edit_habit: 'Редактировать привычку',
    name: 'НАЗВАНИЕ',
    habit_type: 'ТИП ПРИВЫЧКИ',
    numeric_type: '📊 Числовой',
    simple_type: '✓ Простой',
    unit_label: 'ЕД. ИЗМЕРЕНИЯ',
    daily_goal: 'ДНЕВНАЯ ЦЕЛЬ',
    quick_add_buttons: 'КНОПКИ БЫСТРОГО ДОБАВЛЕНИЯ',
    quick_add_sub: 'Пустые поля будут скрыты на карточке.',
    track_calories: 'УЧЁТ КАЛОРИЙ',
    calorie_direction: 'НАПРАВЛЕНИЕ',
    calorie_burned: 'Сожжено',
    calorie_saved: 'Сэкономлено',
    calories_per_unit: 'ККАЛ ЗА ЕДИНИЦУ',
    calories_hint: 'За одно выполнение; для числовых привычек умножается на количество.',
    calories_widget_title: 'КАЛОРИИ',
    body_metrics: 'Параметры тела',
    weight_kg_label: 'ВЕС (КГ)',
    height_cm_label: 'РОСТ (СМ)',
    body_saved: 'Параметры тела сохранены',
    failed_save_body: 'Не удалось сохранить параметры',
    color_label: 'ЦВЕТ',
    emoji_label: 'ЭМОДЗИ',
    delete_btn: 'УДАЛИТЬ',
    cancel_btn: 'ОТМЕНА',
    save_btn: 'СОХРАНИТЬ',
    name_placeholder: 'например: 💪 Подтягивания, 🧘 Медитация',
    habit_delete_confirm: 'Удалить эту привычку навсегда?',
    habit_deleted_toast: 'Привычка удалена',
    failed_delete_habit: 'Не удалось удалить',
    failed_save_habit: 'Не удалось сохранить',
    habit_updated_toast: 'Привычка обновлена!',
    habit_added_toast: 'Привычка добавлена!',
    
    add_log_title: 'Добавить запись',
    activity_select: 'ПРИВЫЧКА',
    amount_label: 'КОЛИЧЕСТВО',
    amount_placeholder: 'Введите число...',
    log_added_toast: 'Запись добавлена!',
    create_habit_first: 'Сначала создайте привычку',

    // Motivation
    lets_go: 'Погнали 🚀',

    // Notifications
    notifications: 'Уведомления',
    notif_sub: 'Алматы: 8:00, 13:00, 20:00 — если нет записей',
    notif_enable: 'Включить',
    notif_disable: 'Отключить',
    notif_enabled: 'Уведомления включены!',
    notif_disabled: 'Уведомления отключены',
    notif_not_supported: 'Не поддерживается',
    notif_denied: 'Заблокированы в настройках браузера',
    notif_error: 'Не удалось включить уведомления',

    // Health Sync
    health_sync: 'Синхронизация здоровья',
    health_sync_sub: 'Tasker + Health Connect (Android)',
    generate_token: 'Создать токен',
    regenerate_token: 'Пересоздать',
    regenerate_confirm: 'Создать новый токен? Старый перестанет работать.',
    token_copied: 'Токен скопирован!',
    token_copy_error: 'Не удалось скопировать — скопируйте вручную',
    token_regenerated: 'Новый токен создан',
    token_error: 'Не удалось создать токен',
    tasker_instruction: '<b>Настройка:</b> Установите Tasker + плагин <i>Health Connect for Tasker</i>. Создайте ежедневный профиль для чтения шагов, затем добавьте HTTP POST:<br><b>URL:</b> <code>{url}/api/ingest</code><br><b>Заголовок:</b> <code>Authorization: Bearer &lt;токен&gt;</code><br><b>Тело:</b> <code>{"steps": %hcsteps, "date": "%DATE"}</code>',
  }
};

const MOTIVATION = {
  en: [
    'Today is the best day to get 1% better. 💪',
    'A small step today is a big result a year from now. 🚀',
    'Discipline is the bridge between goals and achievement.',
    "Don't skip today: your streak lives on consistency. 🔥",
    "You don't have to be perfect. Just be consistent.",
    'Every check-in brings you closer to your best self. ✨',
    'Motivation gets you started, habit keeps you going. Go!',
  ],
  ru: [
    'Сегодня лучший день, чтобы стать на 1% лучше. 💪',
    'Маленький шаг сегодня — большой результат через год. 🚀',
    'Дисциплина — это мост между целями и достижениями.',
    'Не пропускайте сегодня: ваш стрик держится на постоянстве. 🔥',
    'Не нужно быть идеальным. Достаточно быть регулярным.',
    'Каждая отметка приближает вас к лучшей версии себя. ✨',
    'Мотивация помогает начать, привычка помогает продолжать. Вперед!',
  ]
};

// Справочник поддерживаемых языков (единая точка для переключателя и автодетекта).
// Чтобы добавить язык: добавьте запись сюда И одноимённый словарь в TRANSLATIONS (ключ = code).
// Весь остальной UI (переключатель, t(), автодетект) подхватит его автоматически.
const LANGUAGES = [
  { code: 'en', label: 'ENG', name: 'English' },
  { code: 'ru', label: 'RUS', name: 'Русский' },
];
function isSupportedLang(code) { return LANGUAGES.some((l) => l.code === code); }
// Язык по умолчанию: сохранённый (если поддерживается) → по языку браузера → первый из справочника.
function detectLang() {
  try {
    const saved = localStorage.getItem('antigravity-lang');
    if (saved && isSupportedLang(saved)) return saved;
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    if (isSupportedLang(nav)) return nav;
  } catch (e) {}
  return LANGUAGES[0].code;
}

function t(key, replacements = {}) {
  const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  Object.keys(replacements).forEach((k) => {
    text = text.replace(`{${k}}`, replacements[k]);
  });
  return text;
}

function applyLanguage(lang) {
  state.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  const emailInput = document.getElementById('emailInput');
  if (emailInput) emailInput.placeholder = t('email_placeholder');
  
  const passwordInput = document.getElementById('passwordInput');
  if (passwordInput) passwordInput.placeholder = t('password_placeholder');
  
  const actNameInput = document.getElementById('actNameInput');
  if (actNameInput) actNameInput.placeholder = t('name_placeholder');
  
  const logAmountInput = document.getElementById('logAmountInput');
  if (logAmountInput) logAmountInput.placeholder = t('amount_placeholder');

  syncThemeUI(); // updates local theme switch title/icons if needed
  if (state.user) {
    renderCurrentTab();
  }
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// HTML-экранирование пользовательских данных (защита от XSS в innerHTML-шаблонах)
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function extractEmojiAndName(fullName = '') {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
  const match = String(fullName).match(emojiRegex);
  if (match) {
    const emoji = match[1];
    const name = fullName.replace(emojiRegex, '');
    return { emoji, name };
  }
  return { emoji: null, name: fullName };
}

function getEmoji(name = '') {
  const extracted = extractEmojiAndName(name).emoji;
  if (extracted) return extracted;

  const lower = name.toLowerCase();
  if (lower.includes('подтягиван') || lower.includes('pull-up') || lower.includes('спорт') || lower.includes('gym')) return '💪';
  if (lower.includes('отжиман') || lower.includes('push-up') || lower.includes('бег') || lower.includes('run')) return '🏃';
  if (lower.includes('чтени') || lower.includes('read') || lower.includes('книг') || lower.includes('book')) return '📖';
  if (lower.includes('математ') || lower.includes('math') || lower.includes('расчет')) return '🧮';
  if (lower.includes('pl-300') || lower.includes('study') || lower.includes('изуч') || lower.includes('учеб') || lower.includes('learn')) return '📚';
  return '✨';
}

// ==========================================
// 2. API CLIENT
// ==========================================
async function fetchJson(url, options = {}) {
  options.credentials = 'same-origin';
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      const hadUser = !!state.user;
      state.user = null;
      renderAuth();
      if (hadUser) showToast('Session expired, please sign in again', 'error');
      throw new Error('Authentication required');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

const api = {
  getMe: () => fetchJson('/api/me'),
  updateMe: (data) => fetchJson('/api/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getConfig: () => fetchJson('/api/config'),
  login: (email, password, turnstile) => fetchJson('/api/login', { method: 'POST', body: JSON.stringify({ email, password, turnstile }) }),
  register: (email, password, turnstile) => fetchJson('/api/register', { method: 'POST', body: JSON.stringify({ email, password, turnstile }) }),
  logout: () => fetchJson('/api/logout', { method: 'POST' }),
  getActivities: () => fetchJson('/api/activities'),
  createActivity: (data) =>
    fetchJson('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id, data) =>
    fetchJson(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteActivity: (id) => fetchJson(`/api/activities/${id}`, { method: 'DELETE' }),
  addLog: (activityId, amount, day) =>
    fetchJson('/api/logs', { method: 'POST', body: JSON.stringify({ activity_id: activityId, amount, day }) }),
  clearDay: (activityId, day) =>
    fetchJson('/api/logs/clear', { method: 'POST', body: JSON.stringify({ activity_id: activityId, day }) }),
  getStats: (day, days) => fetchJson(`/api/stats?today=${day}&days=${days}`),
  saveWorkout: (day, sets) => fetchJson('/api/workouts', { method: 'POST', body: JSON.stringify({ day, sets }) }),
  getWorkoutStats: (day) => fetchJson(`/api/workouts/stats?today=${day}`),
  getExercises: () => fetchJson('/api/exercises'),
  createExercise: (data) => fetchJson('/api/exercises', { method: 'POST', body: JSON.stringify(data) }),
  updateExercise: (id, data) => fetchJson(`/api/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExercise: (id) => fetchJson(`/api/exercises/${id}`, { method: 'DELETE' }),
  getWorkoutDay: (day) => fetchJson(`/api/workouts/day?day=${day}`),
  getExerciseProgress: (id) => fetchJson(`/api/workouts/progress?exercise_id=${id}`),
  getMuscleStats: (day) => fetchJson(`/api/workouts/muscles?today=${day}`),
  getLogs: (activityId) => fetchJson(`/api/activities/${activityId}/logs`),
  deleteLog: (id) => fetchJson(`/api/logs/${id}`, { method: 'DELETE' }),
  updateLog: (id, amount) => fetchJson(`/api/logs/${id}`, { method: 'PATCH', body: JSON.stringify({ amount }) }),
  savePushSub: (sub) => fetchJson('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  deletePushSub: (endpoint) => fetchJson('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
  getToken: () => fetchJson('/api/tokens'),
  generateToken: () => fetchJson('/api/tokens', { method: 'POST' }),
};

// ==========================================
// 3. TOAST
// ==========================================
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = '';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-xl';
  icon.textContent = type === 'success' ? 'check_circle' : 'warning';
  icon.style.color = type === 'error' ? 'rgb(var(--error))' : 'rgb(var(--secondary))';
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + message));
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==========================================
// 4. ССЫЛКИ НА DOM
// ==========================================
const authScreen = document.getElementById('auth');
const appScreen = document.getElementById('app');
const viewContainer = document.getElementById('view');
const userEmailSpan = document.getElementById('userEmail');
const userNameSpan = document.getElementById('userName');

let authMode = 'login';

// ==========================================
// 5. ХЕЛПЕРЫ РЕНДЕРА
// ==========================================
function pageHeader(title, subtitle, rightNode) {
  const header = document.createElement('header');
  header.className = 'mb-md sm:mb-xl flex flex-wrap gap-4 justify-between items-end';
  const left = document.createElement('div');
  left.innerHTML = `
    <h2 class="text-headline-lg sm:text-headline-xl font-headline-xl text-on-surface">${title}</h2>
    ${subtitle ? `<p class="text-body-md sm:text-body-lg font-body-lg text-on-surface-variant mt-1">${subtitle}</p>` : ''}
  `;
  header.appendChild(left);
  if (rightNode) header.appendChild(rightNode);
  return header;
}

function backHeader(title) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-md flex items-center gap-3';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-on-surface hover:bg-surface-container-high/60 active:scale-95 transition shrink-0';
  back.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>';
  back.addEventListener('click', () => { state.selectedActivityId = null; renderCurrentTab(); });
  const h = document.createElement('h2');
  h.className = 'text-headline-lg font-headline-lg text-on-surface truncate';
  h.textContent = title;
  wrap.appendChild(back);
  wrap.appendChild(h);
  return wrap;
}

function renderAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  const authTabs = document.getElementById('authTabs');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authError = document.getElementById('authError');
  authError.textContent = '';
  authTabs.querySelectorAll('button').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    const isActive = (authMode === 'login' && action === 'login-tab') || (authMode === 'register' && action === 'register-tab');
    btn.className = isActive
      ? 'flex-1 py-3 text-center text-label-md font-label-md rounded-lg bg-primary text-on-primary shadow transition-all'
      : 'flex-1 py-3 text-center text-label-md font-label-md text-on-surface-variant rounded-lg transition-all';
  });
  authSubmitBtn.textContent = authMode === 'login' ? 'SIGN IN' : 'SIGN UP';
}

function updateNavUI() {
  // Сайдбар (.nav-link) и нижний таб-бар (.bottom-tab) — оба помечаются [data-tab]
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-tab') === state.activeTab && !state.selectedActivityId;
    btn.classList.toggle('active', active);
  });
}

async function renderCurrentTab() {
  updateNavUI();
  viewContainer.textContent = '';
  try {
    if (state.selectedActivityId) {
      await renderActivityDetail(state.selectedActivityId);
    } else if (state.activeTab === 'today') {
      await renderDashboardTab();
    } else if (state.activeTab === 'calendar') {
      await renderCalendarTab();
    } else if (state.activeTab === 'stats') {
      await renderStatsTab();
    } else if (state.activeTab === 'profile') {
      await renderProfileTab();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 6. TODAY (дашборд)
// ==========================================
async function renderDashboardTab() {
  const todayDate = localDay();
  let res;
  try {
    res = await api.getStats(todayDate, 1);
  } catch (err) {
    showToast(t('failed_load_stats'), 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  // Подсчёт прогресса
  let overallPercent = 0, habitsLeft = 0, maxStreak = 0;
  if (activities.length > 0) {
    let completedSum = 0;
    activities.forEach((act) => {
      const comp = act.daily_goal > 0 ? Math.min(act.today_total / act.daily_goal, 1) : (act.today_total > 0 ? 1 : 0);
      completedSum += comp;
      if (comp < 1) habitsLeft++;
      if (act.streak > maxStreak) maxStreak = act.streak;
    });
    overallPercent = Math.round((completedSum / activities.length) * 100);
  }

  viewContainer.appendChild(pageHeader(t('hi_hero'), t('ready_ascend')));

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState(t('no_habits'), t('add_first_goal')));
    return;
  }

  // Сетка карточек (адаптивная ширина колонок ≥320px на десктопе)
  const grid = document.createElement('div');
  grid.className = 'card-grid';

  // Карточка сводки (Daily Momentum)
  const summary = document.createElement('div');
  summary.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 relative overflow-hidden flex flex-col';
  summary.innerHTML = `
    <h3 class="text-headline-md font-headline-md mb-1">${t('daily_momentum')}</h3>
    <p class="text-body-md font-body-md text-on-surface-variant mb-6">${habitsLeft === 0 ? t('all_goals_done') : t('goals_left', { n: habitsLeft })}</p>
    <div class="mt-auto flex items-center justify-between">
      <div>
        <p class="text-headline-xl font-headline-xl text-primary leading-none">${overallPercent}%</p>
        <p class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">${t('ascended')}</p>
      </div>
      <div class="text-right text-secondary font-semibold flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
        <span class="text-headline-md font-headline-md">${maxStreak}${state.lang === 'ru' ? 'д' : 'd'}</span>
      </div>
    </div>
  `;
  grid.appendChild(summary);

  // Выполненные карточки опускаем в конец (стабильная сортировка сохраняет порядок внутри групп)
  const ordered = [...activities].sort((a, b) => (isHabitDone(a) ? 1 : 0) - (isHabitDone(b) ? 1 : 0));
  ordered.forEach((act) => grid.appendChild(habitCard(act, todayDate)));
  viewContainer.appendChild(grid);
}

// «Выполнена ли привычка сегодня»: simple — отмечена; numeric — достигнута цель (100%).
function isHabitDone(act) {
  return act.type === 'simple'
    ? act.today_total > 0
    : (act.daily_goal > 0 && act.today_total >= act.daily_goal);
}

function habitCard(act, todayDate) {
  const color = act.color || '#0059b5';
  const card = document.createElement('div');
  // h-full + flex-col + mt-auto на блоке кнопок → карточки в ряду одинаковой высоты, кнопки прижаты к низу (задача 8)
  card.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col gap-md group hover:border-primary/30 transition-all duration-500 cursor-pointer';
  card.addEventListener('click', () => { state.selectedActivityId = act.id; renderCurrentTab(); });
  if (isHabitDone(act)) card.classList.add('habit-done');

  const isSimple = act.type === 'simple';
  const doneToday = act.today_total > 0;
  let percent = 0;
  if (isSimple) percent = doneToday ? 100 : 0;
  else if (act.daily_goal > 0) percent = Math.min((act.today_total / act.daily_goal) * 100, 100);
  else if (act.today_total > 0) percent = 100;
  const done = isHabitDone(act);

  // Шапка: название + стрик + (numeric — счётчик / simple — статус-галочка)
  const head = document.createElement('div');
  head.className = 'flex justify-between items-start';
  const streakColor = act.streak === 0 ? 'rgb(var(--outline))' : (done ? 'rgb(var(--secondary))' : color);
  const rightHtml = isSimple
    ? `<span class="material-symbols-outlined shrink-0 ml-2 text-3xl" style="font-variation-settings:'FILL' ${doneToday ? 1 : 0}; color:${doneToday ? 'rgb(var(--secondary))' : 'rgb(var(--outline-variant))'}">${doneToday ? 'check_circle' : 'radio_button_unchecked'}</span>`
    : `<span class="text-headline-md font-headline-md text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0 ml-2">${Number(act.today_total.toFixed(1))} / ${act.daily_goal}</span>`;
  head.innerHTML = `
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(extractEmojiAndName(act.name).name)}</span>
      <div class="flex items-center gap-1 font-semibold" style="color:${streakColor}">
        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' ${act.streak === 0 ? 0 : 1};">local_fire_department</span>
        <span class="text-label-md font-label-md">${t('streak', { n: act.streak })}</span>
      </div>
    </div>
    ${rightHtml}
  `;
  card.appendChild(head);

  // Прогресс-бар — цвет привычки (зелёный при выполнении)
  const track = document.createElement('div');
  track.className = 'w-full h-4 bg-surface-container-high rounded-full overflow-hidden relative';
  const fill = document.createElement('div');
  fill.className = 'absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out';
  fill.style.width = '0%';
  fill.style.background = done ? 'rgb(var(--secondary-container))' : color;
  fill.style.boxShadow = `0 0 12px ${done ? 'rgb(var(--secondary-container) / 0.5)' : color + '66'}`;
  track.appendChild(fill);
  card.appendChild(track);
  requestAnimationFrame(() => { fill.style.width = `${percent}%`; });

  // --- Разовая (simple): одна кнопка во всю ширину; повторное нажатие = отмена ---
  if (isSimple) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mt-auto w-full py-3 rounded-xl text-label-md font-label-md font-semibold flex items-center justify-center gap-2 transition-all active:scale-95';
    if (doneToday) {
      btn.style.background = 'rgb(var(--secondary-container))';
      btn.style.color = 'rgb(var(--on-surface))';
      btn.title = 'Tap to undo';
      btn.classList.add('hover:opacity-90');
      btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">check</span> ${t('done_today')}`;
      btn.addEventListener('click', (e) => resetDay(e, act, todayDate));
    } else {
      btn.classList.add('bg-on-surface', 'text-on-primary', 'hover:opacity-90');
      btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">done</span> ${t('mark_done')}`;
      btn.addEventListener('click', (e) => quickLog(e, act, 1, todayDate));
    }
    card.appendChild(btn);
    return card;
  }

  // --- Численная (numeric): кнопки из quick_add_*; иначе ручной ввод ---
  const presets = [act.quick_add_1, act.quick_add_2, act.quick_add_3].filter((v) => v != null && v > 0);
  const hasGoal = act.daily_goal > 0;
  const remaining = hasGoal ? Math.max(act.daily_goal - act.today_total, 0) : 0;
  // «Done» логирует ТОЛЬКО остаток до цели; при достижении — неактивна (без дублей)
  const makeDone = () => {
    const d = document.createElement('button');
    d.type = 'button';
    if (remaining > 0) {
      d.className = 'bg-on-surface text-on-primary py-3 px-1 rounded-xl text-label-sm font-label-md hover:opacity-90 active:scale-95 transition-all';
      d.textContent = t('done');
      d.addEventListener('click', (e) => quickLog(e, act, remaining, todayDate));
    } else {
      d.className = 'py-3 px-1 rounded-xl flex items-center justify-center cursor-default';
      d.style.background = 'rgb(var(--secondary-container))';
      d.style.color = 'rgb(var(--on-surface))';
      d.title = 'Goal reached';
      d.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span>';
      d.addEventListener('click', (e) => e.stopPropagation());
    }
    return d;
  };

  if (presets.length) {
    const btnRow = document.createElement('div');
    btnRow.className = 'grid gap-sm mt-auto';
    btnRow.style.gridTemplateColumns = `repeat(${presets.length + (hasGoal ? 1 : 0)}, minmax(0, 1fr))`;
    presets.forEach((val) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'glass-panel py-3 px-1 rounded-xl text-label-sm font-label-md hover:bg-surface-container-highest transition-colors active:scale-95';
      b.textContent = `+${Number(val)}`;
      b.addEventListener('click', (e) => quickLog(e, act, val, todayDate));
      btnRow.appendChild(b);
    });
    if (hasGoal) btnRow.appendChild(makeDone());
    card.appendChild(btnRow);
  } else {
    // Кнопки не заданы — ручной ввод + «Записать» (+ Done при наличии цели)
    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-sm mt-auto';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0'; input.step = 'any';
    input.placeholder = act.unit || 'number';
    input.className = 'field-input flex-1 min-w-0 py-2';
    input.addEventListener('click', (e) => e.stopPropagation());
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'glass-panel px-4 rounded-xl text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95';
    add.textContent = t('log');
    add.addEventListener('click', (e) => {
      const v = parseFloat(input.value);
      if (!isFinite(v) || v <= 0) { e.stopPropagation(); showToast(t('enter_number_toast'), 'error'); return; }
      input.value = '';
      quickLog(e, act, v, todayDate);
    });
    row.appendChild(input);
    row.appendChild(add);
    if (hasGoal) row.appendChild(makeDone());
    card.appendChild(row);
  }

  // Сброс сегодняшних записей (исправление ошибок ввода)
  if (act.today_total > 0) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'text-label-sm font-label-sm text-on-surface-variant/70 hover:text-error transition-colors self-center mt-2';
    reset.textContent = t('reset_today');
    reset.addEventListener('click', (e) => resetDay(e, act, todayDate));
    card.appendChild(reset);
  }

  return card;
}

async function quickLog(e, act, val, todayDate) {
  e.stopPropagation();
  if (!val || val <= 0) { showToast(t('goal_reached_toast')); return; }
  try {
    await api.addLog(act.id, val, todayDate);
    showToast(t('added_toast', { amount: Number(val.toFixed ? val.toFixed(1) : val), unit: act.unit || '' }));
    await renderCurrentTab();
  } catch (err) {
    showToast(t('failed_log_toast'), 'error');
  }
}

// Сброс сегодняшних записей привычки (отмена/исправление)
async function resetDay(e, act, todayDate) {
  e.stopPropagation();
  const cleanName = extractEmojiAndName(act.name).name;
  if (!confirm(t('reset_confirm', { name: cleanName }))) return;
  try {
    await api.clearDay(act.id, todayDate);
    showToast(t('reset_toast'));
    await renderCurrentTab();
  } catch (err) {
    showToast(t('failed_reset_toast'), 'error');
  }
}

function emptyState(title, subtitle) {
  const el = document.createElement('div');
  el.className = 'glass-panel rounded-[32px] p-lg text-center shadow-sm';
  el.innerHTML = `
    <p class="text-headline-md font-headline-md text-on-surface mb-2">${title}</p>
    <p class="text-body-md font-body-md text-on-surface-variant">${subtitle}</p>
  `;
  return el;
}

// ==========================================
// 7. ДЕТАЛЬ ПРИВЫЧКИ
// ==========================================
async function renderActivityDetail(activityId) {
  const todayDate = localDay();
  let resp;
  try {
    resp = await api.getStats(todayDate, state.statsDays);
  } catch (err) {
    showToast(t('failed_load_details'), 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const act = (resp.activities || []).find((a) => a.id === activityId);
  if (!act) {
    showToast(t('activity_not_found'), 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const color = act.color || '#0059b5';
  const isSimple = act.type === 'simple';
  const series = act.series || [];
  const doneDays = series.filter((s) => s.total > 0).length;
  // simple: «всего» = число выполненных дней; numeric: сумма значений
  const total = isSimple ? doneDays : series.reduce((a, c) => a + c.total, 0);
  const best = series.length ? Math.max(...series.map((s) => s.total)) : 0;

  viewContainer.appendChild(backHeader(`${getEmoji(act.name)} ${esc(extractEmojiAndName(act.name).name)}`));

  // Hero + три плашки
  const hero = document.createElement('section');
  hero.className = 'grid grid-cols-12 gap-gutter mb-md';
  hero.innerHTML = `
    <div class="col-span-12 md:col-span-6 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col justify-center items-center text-center">
      <span class="text-headline-xl font-headline-xl text-primary leading-none">${isSimple ? doneDays : Number(total.toFixed(1))}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-2">${isSimple ? t('days_done') : t('total_unit', { unit: esc((act.unit || '').toUpperCase()) })}</span>
    </div>
    <div class="col-span-12 md:col-span-6 grid grid-cols-3 gap-gutter">
      ${miniStat(t('today_label'), isSimple ? (act.today_total > 0 ? '✓' : '—') : Number(act.today_total.toFixed(1)))}
      ${isSimple ? miniStat(t('days_unit'), doneDays, color) : miniStat(t('best_label'), Number(best.toFixed(1)), color)}
      ${miniStat(t('streak_label'), act.streak + (state.lang === 'ru' ? 'д' : 'd'))}
    </div>
  `;
  viewContainer.appendChild(hero);

  // Недельный график
  const chartSec = document.createElement('section');
  chartSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  const chartHead = document.createElement('div');
  chartHead.className = 'flex justify-between items-center mb-6';
  chartHead.innerHTML = `<h3 class="text-headline-md font-headline-md">${t('weekly_progress')}</h3><span class="text-label-md font-label-md text-primary">${t('days_count')}</span>`;
  chartSec.appendChild(chartHead);

  const last7 = series.slice(-7);
  const maxVal = isSimple ? 1 : Math.max(...last7.map((s) => s.total), act.daily_goal || 1);
  const bars = document.createElement('div');
  bars.className = 'flex items-end justify-between h-40 gap-3 pt-4';
  const wd = state.lang === 'ru' ? ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay() (0 = Sun)
  last7.forEach((d) => {
    const isToday = d.day === todayDate;
    const date = new Date(d.day + 'T00:00:00');
    const val = isSimple ? (d.total > 0 ? 1 : 0) : d.total;
    const h = maxVal > 0 ? (val / maxVal) * 100 : 0;
    const done = !isSimple && act.daily_goal > 0 && d.total >= act.daily_goal;
    const col = document.createElement('div');
    col.className = 'flex-1 flex flex-col items-center gap-2 group relative';
    const tip = document.createElement('div');
    tip.className = 'absolute -top-2 bg-on-surface text-on-primary text-xs font-bold rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10';
    tip.textContent = isSimple ? (d.total > 0 ? t('done').toLowerCase() : '—') : `${Number(d.total.toFixed(1))} ${act.unit || ''}`;
    const tr = document.createElement('div');
    tr.className = 'w-full bg-surface-container-high rounded-t-xl relative h-28 overflow-hidden';
    const bf = document.createElement('div');
    bf.className = 'absolute bottom-0 left-0 w-full rounded-t-xl transition-all duration-700 ease-out';
    bf.style.height = `${h}%`;
    bf.style.background = done ? 'rgb(var(--secondary-container))' : color;
    bf.style.boxShadow = done ? '0 0 10px rgb(var(--secondary-container) / 0.45)' : `0 0 10px ${color}55`;
    tr.appendChild(bf);
    const lab = document.createElement('span');
    lab.className = `text-label-sm font-label-sm ${isToday ? 'font-bold text-primary' : 'text-on-surface-variant/60'} text-center flex flex-col items-center`;
    lab.innerHTML = `<span>${wd[date.getDay()]}</span><span class="text-[10px] opacity-70 font-normal mt-0.5">${date.getDate()}</span>`;
    const valLabel = document.createElement('span');
    valLabel.className = 'text-[11px] font-bold text-center mb-1 shrink-0';
    valLabel.style.color = val > 0 ? (done ? 'rgb(var(--secondary))' : color) : 'rgb(var(--outline-variant))';
    valLabel.textContent = val > 0 ? (isSimple ? '✓' : Number(val.toFixed(1))) : '—';
    col.appendChild(tip); col.appendChild(valLabel); col.appendChild(tr); col.appendChild(lab);
    bars.appendChild(col);
  });
  chartSec.appendChild(bars);
  viewContainer.appendChild(chartSec);

  // Достижения
  const goldUnlocked = act.daily_goal > 0 ? (total >= 100 || total >= 10 * act.daily_goal) : (total >= 100);
  const badges = [
    { title: state.lang === 'ru' ? 'Бронза: Первый шаг' : 'Bronze: First Step', icon: 'military_tech', unlocked: total > 0 },
    { title: state.lang === 'ru' ? 'Серебро: Регулярность' : 'Silver: Consistency', icon: 'local_fire_department', unlocked: act.streak >= 3 },
    { title: state.lang === 'ru' ? 'Золото: Сотня' : 'Gold: Century', icon: 'emoji_events', unlocked: goldUnlocked },
    { title: state.lang === 'ru' ? 'Платина: Элита' : 'Platinum: Elite', icon: 'workspace_premium', unlocked: total >= 500 },
  ];
  const achSec = document.createElement('section');
  achSec.className = 'mb-md';
  achSec.innerHTML = `<h3 class="text-headline-md font-headline-md mb-md">${t('achievements')}</h3>`;
  const achWrap = document.createElement('div');
  achWrap.className = 'grid grid-cols-2 sm:grid-cols-4 gap-gutter';
  badges.forEach((b, i) => {
    const c = document.createElement('div');
    c.className = `glass-panel rounded-2xl p-md flex flex-col items-center text-center shadow-sm ${b.unlocked ? '' : 'opacity-40'}`;
    c.innerHTML = `
      <div class="w-14 h-14 rounded-full ${b.unlocked ? 'bg-secondary/10 animate-float' : 'bg-surface-container-high'} flex items-center justify-center mb-2" style="animation-delay:${i * 0.6}s">
        <span class="material-symbols-outlined ${b.unlocked ? 'text-secondary' : 'text-outline'} text-3xl">${b.unlocked ? b.icon : 'lock'}</span>
      </div>
      <span class="text-label-sm font-label-sm font-bold text-center">${b.title}</span>
    `;
    achWrap.appendChild(c);
  });
  achSec.appendChild(achWrap);
  viewContainer.appendChild(achSec);

  // Последние логи
  const logSec = document.createElement('section');
  logSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 log-section';
  logSec.innerHTML = `<h3 class="text-headline-md font-headline-md mb-6">${t('recent_activity')}</h3>`;
  const logList = document.createElement('div');
  logList.className = 'space-y-4';
  logList.innerHTML = `<p class="text-body-md font-body-md text-on-surface-variant text-center py-4">${t('loading_logs')}</p>`;
  logSec.appendChild(logList);
  viewContainer.appendChild(logSec);

  // Асинхронно подгружаем индивидуальные записи
  api.getLogs(activityId).then((data) => {
    const logs = data.logs || [];
    logList.textContent = '';
    if (logs.length === 0) {
      logList.innerHTML = `<p class="text-body-md font-body-md text-on-surface-variant text-center py-4">${t('no_entries')}</p>`;
      return;
    }
    logs.forEach((log) => {
      let timeStr = '';
      try {
        if (log.logged_at) {
          const dObj = new Date(log.logged_at);
          timeStr = dObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}

      const p = log.day.split('-');
      const dateFormatted = `${p[2]}.${p[1]}.${p[0]}`;

      const item = document.createElement('div');
      item.className = 'log-card';

      // Левая зона — иконка (запрет сжатия)
      const iconWrap = document.createElement('div');
      iconWrap.className = 'log-card__icon w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary';
      iconWrap.innerHTML = '<span class="material-symbols-outlined">event_available</span>';
      item.appendChild(iconWrap);

      // Центральная зона — колонка: крупное значение (заголовок) + подпись (подзаголовок)
      const main = document.createElement('div');
      main.className = 'log-card__main';
      const titleHtml = isSimple
        ? '<span class="material-symbols-outlined text-3xl leading-none" style="color:rgb(var(--secondary));font-variation-settings:\'FILL\' 1;">check_circle</span>'
        : `<span class="text-headline-md font-headline-md text-primary leading-none">${Number(log.amount.toFixed(1))}</span><span class="text-label-sm text-outline">${esc(act.unit || '')}</span>`;
      const subMeta = dateFormatted + (timeStr ? ' · ' + timeStr : '');
      main.innerHTML = `
        <div class="log-card__title">${titleHtml}</div>
        <p class="log-card__sub text-label-sm font-label-sm text-on-surface-variant">${isSimple ? t('check_in') : t('amount_logged')} · ${subMeta}</p>
      `;
      item.appendChild(main);

      // Правая зона — кнопки действий (выравнивание по центру)
      const rightSide = document.createElement('div');
      rightSide.className = 'log-card__actions';

      // Кнопка редактирования (только для численных привычек)
      if (!isSimple) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-primary/10 active:scale-90 transition-all';
        editBtn.innerHTML = '<span class="material-symbols-outlined text-xl">edit</span>';
        editBtn.title = t('edit_entry');
        editBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const currentAmount = log.amount;
          const newStr = prompt(t('edit_amount_prompt', { date: dateFormatted }), currentAmount);
          if (newStr === null) return; // Cancelled
          const newAmount = parseFloat(newStr);
          if (isNaN(newAmount) || newAmount <= 0) {
            showToast(t('positive_number_toast'), 'error');
            return;
          }
          try {
            await api.updateLog(log.id, newAmount);
            showToast(t('entry_updated'));
            await renderCurrentTab();
          } catch (err) {
            showToast(t('failed_update_entry'), 'error');
          }
        });
        rightSide.appendChild(editBtn);
      }

      // Кнопка удаления
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/70 hover:text-error hover:bg-error/10 active:scale-90 transition-all';
      delBtn.innerHTML = '<span class="material-symbols-outlined text-xl">delete</span>';
      delBtn.title = t('delete_entry');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(t('delete_entry_confirm'))) return;
        try {
          await api.deleteLog(log.id);
          showToast(t('entry_deleted'));
          await renderCurrentTab();
        } catch (err) {
          showToast(t('failed_delete_entry'), 'error');
        }
      });
      rightSide.appendChild(delBtn);

      item.appendChild(rightSide);
      item.addEventListener('click', (e) => e.stopPropagation()); // предотвращаем переход при клике
      logList.appendChild(item);
    });
  }).catch((err) => {
    logList.innerHTML = `<p class="text-body-md font-body-md text-error text-center py-4">${t('failed_load_details')}</p>`;
  });

  // Добавляем FAB (плавающую кнопку +)
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-40';
  fab.style.background = `linear-gradient(135deg, ${color}, rgb(var(--tertiary)))`;
  fab.style.boxShadow = `0 10px 25px ${color}66`;
  fab.innerHTML = '<span class="material-symbols-outlined text-[28px]">add</span>';
  fab.title = t('add_log_title');
  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    openLogModal();
  });
  viewContainer.appendChild(fab);
}

function miniStat(label, value, border) {
  return `
    <div class="glass-panel rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm" ${border ? `style="border:2px solid ${border}60"` : ''}>
      <span class="text-headline-md font-headline-md text-primary">${value}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">${label}</span>
    </div>`;
}

// Строка-переключатель языка для вкладки Profile
function languageToggleRow() {
  const row = document.createElement('div');
  row.className = 'glass-panel rounded-2xl p-4 flex items-center justify-between shadow-sm mb-md';
  const label = document.createElement('div');
  label.innerHTML = `
    <p class="text-label-md font-label-md font-bold">${t('language_label')}</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant">${t('language_sub')}</p>
  `;
  const seg = document.createElement('div');
  seg.className = 'flex bg-surface-container rounded-xl p-1 border border-outline-variant/40';
  
  LANGUAGES.forEach(({ code: langCode, label: langLabel, name: langName }) => {
    const b = document.createElement('button');
    b.type = 'button';
    const active = state.lang === langCode;
    b.className = active
      ? 'px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-label-md transition-all'
      : 'px-3 py-1.5 rounded-lg text-on-surface-variant text-label-sm font-label-md transition-all';
    b.textContent = langLabel;
    b.title = langName || langLabel; // полное имя языка — в подсказке
    b.addEventListener('click', () => {
      if (state.lang !== langCode) {
        state.lang = langCode;
        try { localStorage.setItem('antigravity-lang', langCode); } catch(e){}
        applyLanguage(langCode);
      }
    });
    seg.appendChild(b);
  });
  row.appendChild(label);
  row.appendChild(seg);
  return row;
}

// ---------- push notification helpers ----------

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function notificationRow() {
  const row = document.createElement('div');
  row.className = 'glass-panel rounded-2xl p-4 flex items-center justify-between shadow-sm mb-md';

  const label = document.createElement('div');
  label.innerHTML = `
    <p class="text-label-md font-label-md font-bold">${t('notifications')}</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant">${t('notif_sub')}</p>
  `;
  row.appendChild(label);

  const ctrl = document.createElement('div');
  row.appendChild(ctrl);

  const unsupported = !('serviceWorker' in navigator) || !('PushManager' in window);
  if (unsupported) {
    ctrl.innerHTML = `<span class="text-label-sm font-label-sm text-on-surface-variant/60">${t('notif_not_supported')}</span>`;
    return row;
  }

  if (Notification.permission === 'denied') {
    ctrl.innerHTML = `<span class="text-label-sm font-label-sm" style="color:rgb(var(--error))">${t('notif_denied')}</span>`;
    return row;
  }

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) {
    ctrl.innerHTML = `<span class="text-label-sm font-label-sm text-on-surface-variant/60">${t('notif_not_supported')}</span>`;
    return row;
  }

  const currentSub = await reg.pushManager.getSubscription().catch(() => null);

  const btn = document.createElement('button');
  btn.type = 'button';

  if (currentSub) {
    btn.className = 'btn-ghost px-4 py-2 shrink-0';
    btn.style.color = 'rgb(var(--error))';
    btn.textContent = t('notif_disable');
    btn.addEventListener('click', async () => {
      await currentSub.unsubscribe();
      await api.deletePushSub(currentSub.endpoint).catch(() => {});
      showToast(t('notif_disabled'));
      renderCurrentTab();
    });
  } else {
    btn.className = 'btn-primary px-4 py-2 shrink-0';
    btn.textContent = t('notif_enable');
    btn.addEventListener('click', async () => {
      try {
        const cfg = await api.getConfig();
        if (!cfg.vapidPublicKey) { showToast(t('notif_not_supported'), 'error'); return; }
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { showToast(t('notif_denied'), 'error'); renderCurrentTab(); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
        });
        const { endpoint, keys } = sub.toJSON();
        await api.savePushSub({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
        showToast(t('notif_enabled'));
        renderCurrentTab();
      } catch (e) {
        showToast(t('notif_error'), 'error');
      }
    });
  }

  ctrl.appendChild(btn);
  return row;
}

// ==========================================
// 8. ПРОФИЛЬ (настройки + управление привычками)
// ==========================================

async function healthSyncCard() {
  const card = document.createElement('div');
  card.className = 'glass-panel rounded-2xl p-4 shadow-sm mb-md';

  card.innerHTML = `
    <p class="text-label-md font-label-md font-bold">${t('health_sync')}</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant mb-3">${t('health_sync_sub')}</p>
  `;

  const tokenSection = document.createElement('div');
  card.appendChild(tokenSection);

  let currentToken = null;
  try {
    const res = await api.getToken();
    currentToken = res.token || null;
  } catch (_) {}

  function renderToken(token) {
    tokenSection.innerHTML = '';
    currentToken = token;

    if (!token) {
      const genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.className = 'btn-primary px-4 py-2';
      genBtn.textContent = t('generate_token');
      genBtn.addEventListener('click', async () => {
        try {
          const res = await api.generateToken();
          renderToken(res.token);
        } catch (_) {
          showToast(t('token_error'), 'error');
        }
      });
      tokenSection.appendChild(genBtn);
      return;
    }

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 mb-2';

    const inp = document.createElement('input');
    inp.type = 'password';
    inp.readOnly = true;
    inp.value = token;
    inp.className = 'flex-1 text-xs font-mono bg-surface-container rounded-lg px-3 py-2 text-on-surface min-w-0 border-0 outline-none';

    let shown = false;
    const eyeBtn = document.createElement('button');
    eyeBtn.type = 'button';
    eyeBtn.className = 'btn-ghost p-2 shrink-0';
    eyeBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">visibility</span>';
    eyeBtn.addEventListener('click', () => {
      shown = !shown;
      inp.type = shown ? 'text' : 'password';
      eyeBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">${shown ? 'visibility_off' : 'visibility'}</span>`;
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-ghost p-2 shrink-0';
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">content_copy</span>';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(token);
        showToast(t('token_copied'));
      } catch (_) {
        showToast(t('token_copy_error'), 'error');
      }
    });

    row.appendChild(inp);
    row.appendChild(eyeBtn);
    row.appendChild(copyBtn);
    tokenSection.appendChild(row);

    const regenBtn = document.createElement('button');
    regenBtn.type = 'button';
    regenBtn.className = 'btn-ghost px-3 py-1 text-label-sm font-label-sm text-on-surface-variant';
    regenBtn.textContent = t('regenerate_token');
    regenBtn.addEventListener('click', async () => {
      if (!confirm(t('regenerate_confirm'))) return;
      try {
        const res = await api.generateToken();
        renderToken(res.token);
        showToast(t('token_regenerated'));
      } catch (_) {
        showToast(t('token_error'), 'error');
      }
    });
    tokenSection.appendChild(regenBtn);

    const instr = document.createElement('p');
    instr.className = 'text-label-sm font-label-sm text-on-surface-variant mt-3 leading-relaxed';
    instr.innerHTML = t('tasker_instruction').replace('{url}', window.location.origin);
    tokenSection.appendChild(instr);
  }

  renderToken(currentToken);
  return card;
}

// Карточка параметров тела: вес (кг) и рост (см) + расчёт BMI.
function bodyMetricsCard() {
  const card = document.createElement('div');
  card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  const u = state.user || {};
  const renderBmi = () => {
    const w = parseFloat(weightInput.value), h = parseFloat(heightInput.value);
    if (isFinite(w) && w > 0 && isFinite(h) && h > 0) {
      const bmi = w / Math.pow(h / 100, 2);
      bmiEl.textContent = `BMI ${bmi.toFixed(1)}`;
    } else {
      bmiEl.textContent = '';
    }
  };
  card.innerHTML = `
    <h3 class="text-headline-md font-headline-md mb-md">${t('body_metrics')}</h3>
    <div class="flex gap-4">
      <div class="field flex-1">
        <label for="profileWeightInput" class="field-label">${t('weight_kg_label')}</label>
        <input type="number" id="profileWeightInput" min="0" step="any" class="field-input" placeholder="80" />
      </div>
      <div class="field flex-1">
        <label for="profileHeightInput" class="field-label">${t('height_cm_label')}</label>
        <input type="number" id="profileHeightInput" min="0" step="any" class="field-input" placeholder="180" />
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 mt-2">
      <span id="profileBmi" class="text-label-md font-label-md text-secondary"></span>
      <button type="button" id="profileSaveBody" class="btn-primary px-5">${t('save_btn')}</button>
    </div>
  `;
  const weightInput = card.querySelector('#profileWeightInput');
  const heightInput = card.querySelector('#profileHeightInput');
  const bmiEl = card.querySelector('#profileBmi');
  weightInput.value = u.weight != null ? u.weight : '';
  heightInput.value = u.height != null ? u.height : '';
  renderBmi();
  weightInput.addEventListener('input', renderBmi);
  heightInput.addEventListener('input', renderBmi);
  card.querySelector('#profileSaveBody').addEventListener('click', async () => {
    const num = (v) => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; };
    const data = { weight: num(weightInput.value), height: num(heightInput.value) };
    try {
      await api.updateMe(data);
      state.user = { ...(state.user || {}), weight: data.weight, height: data.height };
      showToast(t('body_saved'));
    } catch (err) {
      showToast(t('failed_save_body'), 'error');
    }
  });
  return card;
}

async function renderProfileTab() {
  viewContainer.appendChild(pageHeader(t('profile'), t('settings_habits')));

  // Карточка пользователя
  const userCard = document.createElement('div');
  userCard.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex items-center justify-between gap-3 mb-md';
  const email = (state.user && state.user.email) || '';
  userCard.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <span class="material-symbols-outlined text-2xl">person</span>
      </div>
      <div class="min-w-0">
        <p class="text-headline-md font-headline-md truncate">${esc(email.split('@')[0] || 'Hero')}</p>
        <p class="text-label-sm font-label-sm text-on-surface-variant truncate">${esc(email)}</p>
      </div>
    </div>
  `;
  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'btn-ghost px-4 py-2 shrink-0 flex items-center gap-2';
  logoutBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">logout</span> ${t('sign_out')}`;
  logoutBtn.addEventListener('click', doLogout);
  userCard.appendChild(logoutBtn);
  viewContainer.appendChild(userCard);

  // Переключатель темы, языка, уведомлений и синхронизации здоровья
  viewContainer.appendChild(themeToggleRow());
  viewContainer.appendChild(languageToggleRow());
  viewContainer.appendChild(await notificationRow());
  viewContainer.appendChild(await healthSyncCard());

  // Параметры тела (вес/рост → калории упражнений и BMI)
  viewContainer.appendChild(bodyMetricsCard());

  // Управление привычками
  const habitsHead = document.createElement('div');
  habitsHead.className = 'flex items-center justify-between gap-3 mt-md mb-md';
  habitsHead.innerHTML = `<h3 class="text-headline-md font-headline-md">${t('my_habits')}</h3>`;
  const addBtnNode = document.createElement('button');
  addBtnNode.type = 'button';
  addBtnNode.className = 'btn-primary flex items-center gap-2 px-5';
  addBtnNode.innerHTML = `<span class="material-symbols-outlined text-[20px]">add</span> ${t('add_btn')}`;
  addBtnNode.addEventListener('click', () => openActivityModal(null));
  habitsHead.appendChild(addBtnNode);
  viewContainer.appendChild(habitsHead);

  let res;
  try {
    res = await api.getActivities();
  } catch (err) {
    showToast(t('failed_load_habits'), 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState(t('no_habits_profile'), t('add_first_habit')));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  activities.forEach((act) => {
    const item = document.createElement('div');
    item.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex items-center justify-between gap-3';
    const left = document.createElement('div');
    left.className = 'min-w-0';
    left.innerHTML = `
      <h3 class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(extractEmojiAndName(act.name).name)}</h3>
      <div class="text-label-sm font-label-sm text-on-surface-variant mt-1 flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-full" style="background:${act.color || '#0059b5'}"></span>
        ${t('goal_label', { goal: act.daily_goal, unit: esc(act.unit || '') })}
      </div>
    `;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn-ghost px-4 py-2 shrink-0';
    edit.textContent = t('edit_btn');
    edit.addEventListener('click', () => openActivityModal(act));
    item.appendChild(left);
    item.appendChild(edit);
    grid.appendChild(item);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 8.5 КАЛЕНДАРЬ (сетка месяца с отметками выполнения)
// ==========================================
// hex (#rrggbb) → rgba-строка с заданной альфой; некорректный ввод → primary
function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return `rgb(var(--primary) / ${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

async function renderCalendarTab() {
  viewContainer.appendChild(pageHeader(t('calendar_title'), t('completed_habits_sub')));

  if (!state.calMonth) state.calMonth = localDay().slice(0, 7); // 'YYYY-MM'
  const todayStr = localDay();
  const curYm = todayStr.slice(0, 7);

  const wrap = document.createElement('div');
  wrap.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
  viewContainer.appendChild(wrap);

  const insightHost = document.createElement('div'); // блок «по дням недели»
  viewContainer.appendChild(insightHost);
  const yearHost = document.createElement('div'); // годовой heatmap
  viewContainer.appendChild(yearHost);

  // Легенда
  const legend = document.createElement('p');
  legend.className = 'text-label-sm font-label-sm text-on-surface-variant text-center mt-md';
  legend.textContent = t('legend');
  viewContainer.appendChild(legend);

  // Метаданные месяца 'YYYY-MM'
  function monthBounds(ym) {
    const [y, m] = ym.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return { y, m, daysInMonth, last };
  }

  // Загрузка месяца → агрегаты по дням. Окно ≤31 дня укладывается в лимит /api/stats (90).
  async function loadMonth(ym) {
    const { daysInMonth, last } = monthBounds(ym);
    let anchor, days;
    if (ym === curYm) { anchor = todayStr; days = Number(todayStr.slice(8, 10)); }
    else { anchor = last; days = daysInMonth; }
    const resp = await api.getStats(anchor, days);
    const acts = resp.activities || [];
    const totalHabits = acts.length;
    const info = {}; // iso → { perHabit, doneCount, totalHabits, perfect, ratio }
    let maxSingle = 0; // для нормировки в режиме фильтра
    acts.forEach((a) => {
      const color = a.color || '#0059b5';
      const goal = Number(a.daily_goal) || 0;
      (a.series || []).forEach((s) => {
        if (!String(s.day).startsWith(ym)) return;
        const total = s.total || 0;
        if (total <= 0) return;
        if (state.calHabitFilter === a.id && total > maxSingle) maxSingle = total;
        const done = goal > 0 ? total >= goal : true;
        (info[s.day] = info[s.day] || { perHabit: [] }).perHabit.push({
          id: a.id, name: a.name, color, unit: a.unit || '', total, goal, done,
        });
      });
    });
    Object.keys(info).forEach((iso) => {
      const d = info[iso];
      d.totalHabits = totalHabits;
      d.doneCount = d.perHabit.filter((h) => h.done).length;
      d.perfect = totalHabits > 0 && d.doneCount === totalHabits; // закрыты все привычки дня
      d.ratio = totalHabits ? d.doneCount / totalHabits : 0;
    });
    return { info, acts, totalHabits, maxSingle };
  }

  let data = null;
  const dayDetail = document.createElement('div');
  dayDetail.className = 'cal-day-detail mt-md';

  function shiftMonth(delta) {
    const [y, m] = state.calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    state.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    draw();
  }

  function showDay(iso) {
    dayDetail.textContent = '';
    const d = data.info[iso];
    const p = iso.split('-');
    const dateFmt = `${p[2]}.${p[1]}.${p[0]}`;
    const title = document.createElement('p');
    title.className = 'text-label-md font-label-md font-bold mb-2';
    title.textContent = t('cal_day_detail_title', { date: dateFmt });
    dayDetail.appendChild(title);
    if (!d || !d.perHabit.length) {
      const e = document.createElement('p');
      e.className = 'text-label-sm font-label-sm text-on-surface-variant';
      e.textContent = t('cal_no_activity');
      dayDetail.appendChild(e);
      return;
    }
    if (d.perfect) {
      const badge = document.createElement('p');
      badge.className = 'cal-perfect-badge text-label-sm font-label-sm font-bold mb-2';
      badge.textContent = t('cal_perfect_day');
      dayDetail.appendChild(badge);
    }
    const count = document.createElement('p');
    count.className = 'text-label-sm font-label-sm text-on-surface-variant mb-2';
    count.textContent = t('cal_habits_done', { n: d.doneCount, m: d.totalHabits });
    dayDetail.appendChild(count);
    d.perHabit.forEach((h) => {
      const row = document.createElement('div');
      row.className = 'cal-detail-row';
      const goalTxt = h.goal > 0 ? ` / ${h.goal}` : '';
      const badge = h.done ? t('cal_goal_met') : t('cal_goal_miss');
      const pct = h.goal > 0 ? Math.min(100, Math.round((h.total / h.goal) * 100)) : 100;
      row.innerHTML = `
        <div class="flex items-center justify-between gap-2 min-w-0">
          <span class="text-label-md font-label-md font-bold truncate min-w-0">${esc(h.name)}</span>
          <span class="text-label-sm font-label-sm text-on-surface-variant shrink-0">${esc(String(h.total))}${goalTxt} ${esc(h.unit)} · ${esc(badge)}</span>
        </div>
        <div class="cal-detail-bar"><i style="width:${pct}%;background:${esc(h.color)}"></i></div>
      `;
      dayDetail.appendChild(row);
    });
  }

  async function draw() {
    wrap.textContent = '';
    const [y, m] = state.calMonth.split('-').map(Number);

    // Шапка с навигацией ‹ Месяц Год › + «Сегодня»
    const nav = document.createElement('div');
    nav.className = 'flex items-center justify-between mb-md gap-2';
    const monthTitle = new Date(y, m - 1, 1).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    nav.innerHTML = `
      <button type="button" class="icon-btn" data-nav="-1" aria-label="prev"><span class="material-symbols-outlined">chevron_left</span></button>
      <div class="flex items-center gap-2">
        <span class="text-headline-md font-headline-md capitalize">${esc(monthTitle)}</span>
        ${state.calMonth !== curYm ? `<button type="button" class="cal-today-btn" data-today>${esc(t('cal_today_btn'))}</button>` : ''}
      </div>
      <button type="button" class="icon-btn" data-nav="1" aria-label="next"><span class="material-symbols-outlined">chevron_right</span></button>
    `;
    nav.querySelector('[data-nav="-1"]').addEventListener('click', () => shiftMonth(-1));
    nav.querySelector('[data-nav="1"]').addEventListener('click', () => shiftMonth(1));
    const todayBtn = nav.querySelector('[data-today]');
    if (todayBtn) todayBtn.addEventListener('click', () => { state.calMonth = curYm; draw(); });
    wrap.appendChild(nav);

    try {
      data = await loadMonth(state.calMonth);
    } catch (err) {
      showToast(t('failed_load_calendar'), 'error');
      return;
    }

    // Чипы-фильтры: «Все» + по привычке
    const chips = document.createElement('div');
    chips.className = 'cal-chips';
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'cal-chip' + (state.calHabitFilter == null ? ' cal-chip--active' : '');
    allChip.textContent = t('cal_filter_all');
    allChip.addEventListener('click', () => { state.calHabitFilter = null; draw(); });
    chips.appendChild(allChip);
    data.acts.forEach((a) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cal-chip' + (state.calHabitFilter === a.id ? ' cal-chip--active' : '');
      chip.innerHTML = `<span class="cal-chip__dot" style="background:${esc(a.color || '#0059b5')}"></span><span class="truncate">${esc(a.name)}</span>`;
      chip.addEventListener('click', () => { state.calHabitFilter = state.calHabitFilter === a.id ? null : a.id; draw(); });
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);

    // Сетка
    const grid = document.createElement('div');
    grid.className = 'cal-grid';
    t('weekdays').forEach((d) => {
      const dow = document.createElement('div');
      dow.className = 'cal-dow';
      dow.textContent = d;
      grid.appendChild(dow);
    });
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
      const e = document.createElement('div');
      e.className = 'cal-cell empty';
      grid.appendChild(e);
    }
    const filterAct = state.calHabitFilter != null ? data.acts.find((a) => a.id === state.calHabitFilter) : null;
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const di = data.info[iso];
      const hasActivity = !!di;
      const cell = document.createElement(hasActivity ? 'button' : 'div');
      cell.className = 'cal-cell'
        + (iso === todayStr ? ' today' : '')
        + (di && di.perfect && !filterAct ? ' cal-cell--perfect' : '');

      // Heatmap-фон
      if (filterAct) {
        const h = di && di.perHabit.find((x) => x.id === filterAct.id);
        if (h) {
          const norm = data.maxSingle > 0 ? h.total / data.maxSingle : 0;
          cell.style.background = hexToRgba(filterAct.color, 0.2 + 0.6 * norm);
        }
      } else if (di && di.ratio > 0) {
        cell.style.background = `rgb(var(--primary) / ${(0.15 + 0.55 * di.ratio).toFixed(2)})`;
      }

      const num = document.createElement('span');
      num.textContent = day;
      cell.appendChild(num);

      // Точки (оставляем)
      const dots = document.createElement('div');
      dots.className = 'cal-dots';
      if (filterAct) {
        const h = di && di.perHabit.find((x) => x.id === filterAct.id);
        if (h) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = filterAct.color || '#0059b5';
          dots.appendChild(dot);
        }
      } else if (di) {
        [...new Set(di.perHabit.map((h) => h.color))].slice(0, 3).forEach((c) => {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = c;
          dots.appendChild(dot);
        });
      }
      cell.appendChild(dots);

      if (hasActivity) {
        cell.type = 'button';
        cell.addEventListener('click', () => showDay(iso));
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    wrap.appendChild(dayDetail);
    if (!dayDetail.textContent) {
      dayDetail.innerHTML = `<p class="text-label-sm font-label-sm text-on-surface-variant text-center">${esc(t('cal_tap_hint'))}</p>`;
    }

    renderWeekdayInsight();
    renderYearToggle();
  }

  // ---- Инсайт по дням недели (#9) ----
  function renderWeekdayInsight() {
    insightHost.textContent = '';
    if (!data || !data.totalHabits) return;
    const [y, m] = state.calMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const lastDay = state.calMonth === curYm ? Number(todayStr.slice(8, 10)) : daysInMonth;
    const sum = [0, 0, 0, 0, 0, 0, 0];
    const cnt = [0, 0, 0, 0, 0, 0, 0];
    for (let day = 1; day <= lastDay; day++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const wd = (new Date(y, m - 1, day).getDay() + 6) % 7; // 0 = Пн
      sum[wd] += data.info[iso] ? data.info[iso].ratio : 0;
      cnt[wd] += 1;
    }
    const avg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0));
    const max = Math.max(...avg, 0.0001);
    const labels = t('weekdays');
    let best = 0, worst = 0;
    avg.forEach((v, i) => { if (v > avg[best]) best = i; if (v < avg[worst]) worst = i; });

    const card = document.createElement('div');
    card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mt-md';
    const head = document.createElement('h3');
    head.className = 'text-headline-md font-headline-md mb-md';
    head.textContent = t('cal_weekday_insight');
    card.appendChild(head);
    const bars = document.createElement('div');
    bars.className = 'cal-weekday-bars';
    avg.forEach((v, i) => {
      const col = document.createElement('div');
      col.className = 'cal-wd';
      col.innerHTML = `
        <div class="cal-wd__track"><i style="height:${Math.round((v / max) * 100)}%"></i></div>
        <span class="cal-wd__val">${Math.round(v * 100)}%</span>
        <span class="cal-wd__lbl">${esc(labels[i])}</span>
      `;
      bars.appendChild(col);
    });
    card.appendChild(bars);
    const note = document.createElement('p');
    note.className = 'text-label-sm font-label-sm text-on-surface-variant mt-md';
    note.textContent = `${t('cal_best_day', { d: labels[best] })} · ${t('cal_worst_day', { d: labels[worst] })}`;
    card.appendChild(note);
    insightHost.appendChild(card);
  }

  // ---- Годовой heatmap (#11), ленивый ----
  function renderYearToggle() {
    yearHost.textContent = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-year-toggle mt-md';
    btn.textContent = state.calShowYear ? t('cal_hide_year') : t('cal_show_year');
    btn.addEventListener('click', () => { state.calShowYear = !state.calShowYear; renderYearToggle(); });
    yearHost.appendChild(btn);
    if (state.calShowYear) drawYear(yearHost);
  }

  async function drawYear(host) {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mt-md';
    card.innerHTML = `<h3 class="text-headline-md font-headline-md mb-md">${esc(t('cal_year_heatmap'))}</h3>`;
    host.appendChild(card);
    let resp;
    try {
      resp = await api.getStats(todayStr, 365);
    } catch (e) {
      showToast(t('failed_load_calendar'), 'error');
      return;
    }
    const acts = resp.activities || [];
    const totalHabits = acts.length;
    const done = {};
    acts.forEach((a) => {
      const goal = Number(a.daily_goal) || 0;
      (a.series || []).forEach((s) => {
        const total = s.total || 0;
        if (total <= 0) return;
        const isDone = goal > 0 ? total >= goal : true;
        if (isDone) done[s.day] = (done[s.day] || 0) + 1;
      });
    });
    const level = (iso) => {
      const r = totalHabits ? (done[iso] || 0) / totalHabits : 0;
      if (r <= 0) return 0;
      if (r < 0.34) return 1;
      if (r < 0.67) return 2;
      if (r < 1) return 3;
      return 4;
    };
    // 53 недели назад, выровнено к понедельнику
    const today = new Date(todayStr + 'T00:00:00');
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // назад к понедельнику
    const grid = document.createElement('div');
    grid.className = 'cal-year';
    const cur = new Date(start);
    while (cur <= today) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = `cal-year__cell cal-year__cell--l${level(iso)}`;
      cell.setAttribute('title', t('cal_year_tip', { date: iso, n: done[iso] || 0, m: totalHabits }));
      grid.appendChild(cell);
      cur.setDate(cur.getDate() + 1);
    }
    card.appendChild(grid);
    const legendRow = document.createElement('div');
    legendRow.className = 'cal-year__legend';
    legendRow.innerHTML = `<span>${esc(t('cal_less'))}</span>
      <i class="cal-year__cell cal-year__cell--l0"></i>
      <i class="cal-year__cell cal-year__cell--l1"></i>
      <i class="cal-year__cell cal-year__cell--l2"></i>
      <i class="cal-year__cell cal-year__cell--l3"></i>
      <i class="cal-year__cell cal-year__cell--l4"></i>
      <span>${esc(t('cal_more'))}</span>`;
    card.appendChild(legendRow);
  }

  await draw();
}

// ==========================================
// 9. STATS
// ==========================================
// Сегмент Habits / Gym для вкладки Stats
// Сегмент Habits / Gym для вкладки Stats
function statsModeSeg() {
  const seg = document.createElement('div');
  seg.className = 'seg mb-md';
  [['habits', state.lang === 'ru' ? 'Привычки' : 'Habits'], ['gym', state.lang === 'ru' ? 'Зал' : 'Gym']].forEach(([m, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (state.statsMode === m ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { if (state.statsMode !== m) { state.statsMode = m; renderCurrentTab(); } });
    seg.appendChild(b);
  });
  return seg;
}

function translateExercise(exName) {
  if (state.lang !== 'ru') return exName;
  const map = {
    'Bench Press': 'Жим лежа',
    'Barbell Squat': 'Приседания со штангой',
    'Deadlift': 'Становая тяга',
    'Lat Pulldown': 'Тяга верхнего блока',
    'Seated Dumbbell Press': 'Жим гантелей сидя',
    'Dumbbell Curl': 'Сгибания рук с гантелями',
    'Pull-ups': 'Подтягивания',
    'Leg Press': 'Жим ногами'
  };
  return map[exName] || exName;
}

async function renderStatsTab() {
  // Режим Gym — собственный дашборд аналитики тренировок
  if (state.statsMode === 'gym') {
    viewContainer.appendChild(pageHeader(t('stats_title'), t('gym_analytics_sub')));
    viewContainer.appendChild(statsModeSeg());
    await renderGymStats();
    return;
  }

  // Режим Habits: переключатель периода 7 / 30 дней
  const toggle = document.createElement('div');
  toggle.className = 'flex bg-surface-container rounded-xl p-1 border border-outline-variant/40';
  [7, 30].forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    const active = state.statsPeriod === d;
    b.className = active
      ? 'px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-label-md transition-all'
      : 'px-4 py-2 rounded-lg text-on-surface-variant text-label-md font-label-md transition-all';
    b.textContent = t('days_btn', { n: d });
    b.addEventListener('click', () => { if (state.statsPeriod !== d) { state.statsPeriod = d; renderCurrentTab(); } });
    toggle.appendChild(b);
  });
  viewContainer.appendChild(pageHeader(t('stats_title'), t('habit_dynamics_sub'), toggle));
  viewContainer.appendChild(statsModeSeg());

  let resp;
  try {
    resp = await api.getStats(localDay(), state.statsPeriod);
  } catch (err) {
    showToast(t('failed_load_stats'), 'error');
    return;
  }
  const activities = resp.activities || [];

  // Глобальный счётчик калорий (сожжено / сэкономлено) за 7 / 14 / 30 дней.
  // Показываем только если есть хоть какие-то калорийные данные.
  const cal = resp.calories || { d7: {}, d14: {}, d30: {} };
  const calTotal = ['d7', 'd14', 'd30'].reduce((a, k) => a + (cal[k]?.burned || 0) + (cal[k]?.saved || 0), 0);
  if (calTotal > 0) {
    const kcal = (v) => Math.round(v || 0).toLocaleString(state.lang === 'ru' ? 'ru-RU' : 'en-US');
    const wgt = document.createElement('div');
    wgt.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-gutter';
    const block = (icon, color, title, kind) => `
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2 ${color} font-semibold">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">${icon}</span>
          <span class="text-label-md font-label-md uppercase tracking-wider">${title}</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          ${[7, 14, 30].map((w) => miniStat(t('days_btn', { n: w }), kcal(cal['d' + w] && cal['d' + w][kind]))).join('')}
        </div>
      </div>`;
    wgt.innerHTML = `
      <h3 class="text-headline-md font-headline-md mb-md border-b border-outline-variant/30 pb-3">${t('calories_widget_title')}</h3>
      <div class="flex flex-col sm:flex-row gap-md">
        ${block('local_fire_department', 'text-secondary', t('calorie_burned'), 'burned')}
        ${block('eco', 'text-primary', t('calorie_saved'), 'saved')}
      </div>`;
    viewContainer.appendChild(wgt);
  }

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState(t('no_stats_data'), t('log_habits_stats')));
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-12 gap-gutter';
  activities.forEach((act) => {
    const color = act.color || '#0059b5';
    const isSimple = act.type === 'simple';
    const series = act.series || [];
    const doneDays = series.filter((s) => s.total > 0).length;
    // simple: сумма = число выполненных дней; numeric: сумма значений
    const sum = isSimple ? doneDays : series.reduce((a, c) => a + c.total, 0);
    const sumLabel = isSimple
      ? t('completed_in_period', { period: state.statsPeriod, days: doneDays, daysLabel: doneDays === 1 ? t('day_unit') : t('days_unit') })
      : t('total_over_period', { period: state.statsPeriod, total: Number(sum.toFixed(1)), unit: esc(act.unit || '') });
    const card = document.createElement('div');
    card.className = 'col-span-12 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-md border-b border-outline-variant/30 pb-3">
        <div class="min-w-0">
          <h3 class="text-headline-md font-headline-md leading-[1.2] break-normal">${getEmoji(act.name)} ${esc(extractEmojiAndName(act.name).name)}</h3>
          <span class="text-label-sm font-label-sm text-on-surface-variant">${sumLabel}</span>
        </div>
        <div class="text-right shrink-0 ml-2 text-secondary font-semibold flex items-center gap-1">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
          <span class="text-headline-md font-headline-md">${act.streak}</span>
        </div>
      </div>
    `;
    // SVG-график (для simple — бинарные столбцы: выполнено/нет)
    const w = 460, hgt = 100, chartTop = 18, chartH = 62;
    const maxVal = isSimple ? 1 : Math.max(...series.map((s) => s.total), act.daily_goal || 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    svg.setAttribute('class', 'w-full h-24 mt-3');
    const gap = series.length > 10 ? 3 : 8;
    const bw = (w - gap * (series.length - 1)) / series.length;
    series.forEach((d, i) => {
      const val = isSimple ? (d.total > 0 ? 1 : 0) : d.total;
      let bh = maxVal > 0 ? (val / maxVal) * chartH : 0;
      if (val > 0 && bh < 4) bh = 4;
      const done = !isSimple && act.daily_goal > 0 && d.total >= act.daily_goal;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (i * (bw + gap)).toString());
      rect.setAttribute('y', (chartTop + chartH - bh).toString());
      rect.setAttribute('width', bw.toString());
      rect.setAttribute('height', bh.toString());
      rect.setAttribute('rx', '4');
      // var() в SVG работает только через style, не через presentation-атрибут fill
      rect.style.fill = done ? 'rgb(var(--secondary-container))' : (d.total > 0 ? color : 'rgb(var(--surface-container-high))');
      const tElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      tElement.textContent = isSimple
        ? `${d.day}: ${d.total > 0 ? t('done').toLowerCase() : '—'}`
        : `${d.day}: ${Number(d.total.toFixed(1))} / ${act.daily_goal} ${act.unit || ''}`;
      rect.appendChild(tElement);
      svg.appendChild(rect);

      // Рисуем числовое значение (подпись данных) над столбиком, если оно больше 0
      if (val > 0) {
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.textContent = isSimple ? '✓' : Number(val.toFixed(1));
        valText.setAttribute('x', (i * (bw + gap) + bw / 2).toString());
        valText.setAttribute('y', (chartTop + chartH - bh - 4).toString());
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('font-size', '10px');
        valText.setAttribute('font-weight', 'bold');
        valText.setAttribute('fill', done ? 'rgb(var(--secondary))' : color);
        valText.style.fill = done ? 'rgb(var(--secondary))' : color;
        svg.appendChild(valText);
      }

      // Рисуем подпись даты под каждым столбцом (для 7 дней — все, для 30 дней — с шагом 5)
      const showLabel = (series.length <= 7) || (i % 5 === 0) || (i === series.length - 1);
      if (showLabel) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const dateObj = new Date(d.day + 'T00:00:00');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
        text.textContent = `${dayStr}.${monthStr}`;
        text.setAttribute('x', (i * (bw + gap) + bw / 2).toString());
        text.setAttribute('y', '94');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', '600');
        text.style.fill = 'rgb(var(--on-surface-variant))';
        text.style.opacity = '0.85';
        svg.appendChild(text);
      }
    });
    card.appendChild(svg);
    grid.appendChild(card);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 9.5 GYM ANALYTICS (дашборд тренировок)
// ==========================================
async function renderGymStats() {
  let resp;
  try {
    resp = await api.getWorkoutStats(localDay());
  } catch (err) {
    showToast(t('failed_load_gym'), 'error');
    return;
  }
  const exercises = resp.exercises || [];
  if (exercises.length === 0) {
    viewContainer.appendChild(emptyState(t('no_workouts_yet'), t('finish_workout_analytics')));
    return;
  }

  const tonnage = resp.tonnage || { today: 0, d7: 0, d14: 0, d30: 0 };
  const calories = resp.calories || { today: 0, d7: 0, d14: 0, d30: 0 };
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

  // 1) Карточки период: тоннаж (крупно) + сожжённые калории (мелко) за сегодня / 7 / 14 / 30 дней
  const tonnageGrid = document.createElement('div');
  tonnageGrid.className = 'card-grid mb-md';
  [[t('today_label'), tonnage.today, calories.today], [t('period_days', { n: 7 }), tonnage.d7, calories.d7], [t('period_days', { n: 14 }), tonnage.d14, calories.d14], [t('period_days', { n: 30 }), tonnage.d30, calories.d30]].forEach(([label, tn, cal]) => {
    const c = document.createElement('div');
    c.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col items-center justify-center text-center';
    c.innerHTML = `
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider">${label}</span>
      <span class="text-headline-xl font-headline-xl text-primary leading-none mt-2">${fmt(tn)}</span>
      <span class="text-label-sm font-label-sm text-on-surface-variant mt-1">${t('kg_lifted')}</span>
      <span class="text-label-sm font-label-sm text-secondary mt-2">${fmt(cal)} ${t('kcal_burned')}</span>
    `;
    tonnageGrid.appendChild(c);
  });
  viewContainer.appendChild(tonnageGrid);

  // 2) Распределение по группам мышц (горизонтальные прогресс-бары)
  await renderMuscleDistribution();

  // 3) Календарь тренировок (подсветка дней + подходы за выбранный день)
  renderWorkoutCalendar(resp.days || []);

  // 4) Прогресс весов по упражнению (SVG-линия макс. веса)
  await renderWeightProgress();

  // 5) Топ-3 упражнения по объёму (Volume / Max weight / Est 1RM)
  const head = document.createElement('h3');
  head.className = 'text-headline-md font-headline-md mb-md';
  head.textContent = t('top_exercises');
  viewContainer.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  (resp.top || []).forEach((ex, i) => {
    const c = document.createElement('div');
    c.className = 'h-full glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col gap-md';
    c.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-md font-bold shrink-0">${i + 1}</span>
        <h4 class="text-headline-md font-headline-md leading-[1.2] break-normal min-w-0">${esc(translateExercise(ex.name))}</h4>
      </div>
      <div class="grid grid-cols-3 gap-gutter mt-auto">
        ${miniStat(t('volume_label'), fmt(ex.volume) + ' ' + (state.lang === 'ru' ? 'кг' : 'kg'))}
        ${miniStat(t('max_label'), fmt(ex.maxWeight) + ' ' + (state.lang === 'ru' ? 'кг' : 'kg'))}
        ${miniStat(t('est_1rm_label'), fmt(ex.est1rm) + ' ' + (state.lang === 'ru' ? 'кг' : 'kg'))}
      </div>
      <p class="text-label-sm font-label-sm text-on-surface-variant text-center">${t('sets_reps_total', { sets: ex.sets, reps: fmt(ex.reps) })}</p>
    `;
    grid.appendChild(c);
  });
  viewContainer.appendChild(grid);
}

// Распределение по группам мышц — список с горизонтальными прогресс-барами
async function renderMuscleDistribution() {
  let data;
  try { data = await api.getMuscleStats(localDay()); } catch (e) { return; }
  const muscles = (data && data.muscles) || [];
  if (!muscles.length) return;
  const maxSets = Math.max.apply(null, muscles.map((m) => m.sets || 0)) || 1;

  const head = document.createElement('h3');
  head.className = 'text-headline-md font-headline-md mb-1';
  head.textContent = t('muscle_distribution');
  viewContainer.appendChild(head);
  const sub = document.createElement('p');
  sub.className = 'text-label-sm font-label-sm text-on-surface-variant mb-md';
  sub.textContent = t('muscle_distribution_sub');
  viewContainer.appendChild(sub);

  const card = document.createElement('div');
  card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md flex flex-col gap-4';
  muscles.forEach((m) => {
    const pct = Math.max(6, Math.round((m.sets / maxSets) * 100));
    const row = document.createElement('div');
    row.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-label-md font-label-md font-bold">${esc(m.muscle)}</span>
        <span class="text-label-sm font-label-sm text-on-surface-variant">${t('sets_count', { n: m.sets })}</span>
      </div>
      <div class="h-2 rounded-full bg-surface-container-high overflow-hidden">
        <div class="h-full rounded-full bg-primary" style="width:${pct}%"></div>
      </div>
    `;
    card.appendChild(row);
  });
  viewContainer.appendChild(card);
}

// Календарь тренировок текущего месяца: подсветка дней + подходы за выбранный день
function renderWorkoutCalendar(days) {
  const daySet = new Set(days);
  if (!state.gymCalMonth) state.gymCalMonth = localDay().slice(0, 7); // YYYY-MM

  const head = document.createElement('h3');
  head.className = 'text-headline-md font-headline-md mb-md';
  head.textContent = t('workout_calendar');
  viewContainer.appendChild(head);

  const card = document.createElement('div');
  card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  viewContainer.appendChild(card);
  const dayDetail = document.createElement('div');
  dayDetail.className = 'mt-md';

  function shiftMonth(delta) {
    let [y, m] = state.gymCalMonth.split('-').map(Number);
    m += delta;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    state.gymCalMonth = `${y}-${String(m).padStart(2, '0')}`;
    draw();
  }

  async function showDay(ds) {
    dayDetail.textContent = '';
    let data;
    try { data = await api.getWorkoutDay(ds); } catch (e) { return; }
    const sets = (data && data.sets) || [];
    const p = ds.split('-');
    const dateFormatted = `${p[2]}.${p[1]}.${p[0]}`;
    const title = document.createElement('p');
    title.className = 'text-label-md font-label-md font-bold mb-2';
    title.textContent = t('sets_on_day', { date: dateFormatted });
    dayDetail.appendChild(title);
    if (!sets.length) {
      const e = document.createElement('p');
      e.className = 'text-label-sm font-label-sm text-on-surface-variant';
      e.textContent = t('no_sets_on_day');
      dayDetail.appendChild(e);
      return;
    }
    const kg = state.lang === 'ru' ? 'кг' : 'kg';
    sets.forEach((s) => {
      const r = document.createElement('div');
      r.className = 'gym-set-row';
      r.innerHTML = `
        <span class="text-label-md font-label-md font-bold truncate min-w-0">${esc(translateExercise(s.exercise))}</span>
        <span class="text-label-sm font-label-sm text-on-surface-variant shrink-0">${s.weight} ${kg} × ${s.reps}</span>
      `;
      dayDetail.appendChild(r);
    });
  }

  function draw() {
    card.textContent = '';
    const [y, m] = state.gymCalMonth.split('-').map(Number);
    const nav = document.createElement('div');
    nav.className = 'flex items-center justify-between mb-md';
    const title = new Date(y, m - 1, 1).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    nav.innerHTML = `
      <button type="button" class="icon-btn" data-nav="-1"><span class="material-symbols-outlined">chevron_left</span></button>
      <span class="text-label-md font-label-md font-bold capitalize">${esc(title)}</span>
      <button type="button" class="icon-btn" data-nav="1"><span class="material-symbols-outlined">chevron_right</span></button>
    `;
    nav.querySelector('[data-nav="-1"]').addEventListener('click', () => shiftMonth(-1));
    nav.querySelector('[data-nav="1"]').addEventListener('click', () => shiftMonth(1));
    card.appendChild(nav);

    const grid = document.createElement('div');
    grid.className = 'gym-cal';
    const dow = state.lang === 'ru' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    dow.forEach((d) => {
      const h = document.createElement('div');
      h.className = 'gym-cal__dow';
      h.textContent = d;
      grid.appendChild(h);
    });
    const first = new Date(y, m - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // понедельник — первый
    for (let i = 0; i < startOffset; i++) grid.appendChild(document.createElement('div'));
    const daysInMonth = new Date(y, m, 0).getDate();
    const todayStr = localDay();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const has = daySet.has(ds);
      const cell = document.createElement(has ? 'button' : 'div');
      cell.className = 'gym-cal__day' + (has ? ' gym-cal__day--active' : '') + (ds === todayStr ? ' gym-cal__day--today' : '');
      cell.textContent = d;
      if (has) { cell.type = 'button'; cell.addEventListener('click', () => showDay(ds)); }
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    card.appendChild(dayDetail);
  }

  draw();
  dayDetail.innerHTML = `<p class="text-label-sm font-label-sm text-on-surface-variant text-center">${t('tap_day_hint')}</p>`;
}

// Прогресс весов: выбор упражнения + SVG-линия максимального рабочего веса по дням
async function renderWeightProgress() {
  const head = document.createElement('h3');
  head.className = 'text-headline-md font-headline-md mb-md';
  head.textContent = t('weight_progress');
  viewContainer.appendChild(head);

  const card = document.createElement('div');
  card.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  viewContainer.appendChild(card);

  if (!state.gymExercises || !state.gymExercises.length) {
    try { const d = await api.getExercises(); state.gymExercises = d.exercises || []; } catch (e) {}
  }
  if (!state.gymExercises.length) return;

  const select = document.createElement('select');
  select.className = 'field-input mb-md';
  state.gymExercises.forEach((ex) => {
    const o = document.createElement('option');
    o.value = String(ex.id);
    o.textContent = translateExercise(ex.name);
    select.appendChild(o);
  });
  card.appendChild(select);
  const chartWrap = document.createElement('div');
  card.appendChild(chartWrap);

  async function drawChart(exId) {
    chartWrap.textContent = '';
    let data;
    try { data = await api.getExerciseProgress(exId); } catch (e) { return; }
    const points = (data && data.points) || [];
    if (points.length < 2) {
      const e = document.createElement('p');
      e.className = 'text-label-sm font-label-sm text-on-surface-variant text-center py-6';
      e.textContent = t('no_progress_data');
      chartWrap.appendChild(e);
      return;
    }
    chartWrap.appendChild(buildLineChart(points));
  }

  select.addEventListener('change', () => { state.gymStatsExerciseId = Number(select.value); drawChart(select.value); });
  const initId = state.gymStatsExerciseId && state.gymExercises.some((e) => e.id === state.gymStatsExerciseId)
    ? state.gymStatsExerciseId : state.gymExercises[0].id;
  select.value = String(initId);
  state.gymStatsExerciseId = Number(initId);
  drawChart(initId);
}

// Простая SVG-линия по точкам [{day, maxWeight}] (CSS-переменные через inline style)
function buildLineChart(points) {
  const W = 320, H = 140, padL = 8, padR = 8, padT = 14, padB = 22;
  const vals = points.map((p) => Number(p.maxWeight) || 0);
  const max = Math.max.apply(null, vals);
  const min = Math.min.apply(null, vals);
  const range = (max - min) || 1;
  const n = points.length;
  const xAt = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const yAt = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'w-full h-auto');

  const poly = document.createElementNS(ns, 'polyline');
  poly.setAttribute('points', points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(vals[i]).toFixed(1)}`).join(' '));
  poly.setAttribute('style', 'fill:none;stroke:rgb(var(--primary));stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round');
  svg.appendChild(poly);

  points.forEach((p, i) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', xAt(i).toFixed(1));
    c.setAttribute('cy', yAt(vals[i]).toFixed(1));
    c.setAttribute('r', '2.6');
    c.setAttribute('style', 'fill:rgb(var(--primary))');
    svg.appendChild(c);
  });
  // подписи min/max веса
  const kg = state.lang === 'ru' ? 'кг' : 'kg';
  const lblMax = document.createElementNS(ns, 'text');
  lblMax.setAttribute('x', '2'); lblMax.setAttribute('y', (padT - 4).toFixed(1));
  lblMax.setAttribute('style', 'fill:rgb(var(--on-surface-variant));font-size:10px');
  lblMax.textContent = `${Math.round(max)} ${kg}`;
  svg.appendChild(lblMax);
  const lblMin = document.createElementNS(ns, 'text');
  lblMin.setAttribute('x', '2'); lblMin.setAttribute('y', (H - 6).toFixed(1));
  lblMin.setAttribute('style', 'fill:rgb(var(--on-surface-variant));font-size:10px');
  lblMin.textContent = `${Math.round(min)} ${kg}`;
  svg.appendChild(lblMin);
  return svg;
}

// ==========================================
// 10. МОДАЛКИ
// ==========================================
const activityModal = document.getElementById('activityModal');
const activityForm = document.getElementById('activityForm');
const modalTitle = document.getElementById('modalTitle');
const activityIdInput = document.getElementById('activityIdInput');
const actNameInput = document.getElementById('actNameInput');
const actUnitInput = document.getElementById('actUnitInput');
const actGoalInput = document.getElementById('actGoalInput');
const actColorInput = document.getElementById('actColorInput');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');
const colorPicker = document.getElementById('colorPicker');
const typeSeg = document.getElementById('typeSeg');
const actTypeInput = document.getElementById('actTypeInput');
const numericFields = document.getElementById('numericFields');
const actQa1Input = document.getElementById('actQa1Input');
const actQa2Input = document.getElementById('actQa2Input');
const actQa3Input = document.getElementById('actQa3Input');

// Переключение типа привычки: показываем поля «численной» только для numeric
function setActivityType(type) {
  const t = type === 'simple' ? 'simple' : 'numeric';
  actTypeInput.value = t;
  typeSeg.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-type') === t);
  });
  numericFields.style.display = t === 'simple' ? 'none' : '';
}

typeSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (btn) setActivityType(btn.getAttribute('data-type'));
});

// Учёт калорий: чекбокс показывает/скрывает поля направления и величины
const actTrackCaloriesInput = document.getElementById('actTrackCaloriesInput');
const caloriesFields = document.getElementById('caloriesFields');
const calorieKindSeg = document.getElementById('calorieKindSeg');
const actCalorieKindInput = document.getElementById('actCalorieKindInput');
const actCaloriesInput = document.getElementById('actCaloriesInput');

function setTrackCalories(on) {
  actTrackCaloriesInput.checked = !!on;
  caloriesFields.style.display = on ? '' : 'none';
}
function setCalorieKind(kind) {
  const k = kind === 'saved' ? 'saved' : 'burned';
  actCalorieKindInput.value = k;
  calorieKindSeg.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-kind') === k);
  });
}

actTrackCaloriesInput.addEventListener('change', () => setTrackCalories(actTrackCaloriesInput.checked));
calorieKindSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (btn) setCalorieKind(btn.getAttribute('data-kind'));
});

const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const logActivitySelect = document.getElementById('logActivitySelect');
const logAmountInput = document.getElementById('logAmountInput');

function initColorPicker() {
  colorPicker.textContent = '';
  COLOR_PRESETS.forEach((color) => {
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color;
    if (state.selectedColor === color) sw.classList.add('active');
    sw.addEventListener('click', () => {
      colorPicker.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.selectedColor = color;
      actColorInput.value = color;
    });
    colorPicker.appendChild(sw);
  });
}

const actEmojiInput = document.getElementById('actEmojiInput');
const emojiPicker = document.getElementById('emojiPicker');

function initEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.textContent = '';
  EMOJI_PRESETS.forEach((emoji) => {
    const sw = document.createElement('span');
    sw.className = 'emoji-swatch';
    sw.textContent = emoji;
    if (actEmojiInput.value === emoji) sw.classList.add('active');
    sw.addEventListener('click', () => {
      emojiPicker.querySelectorAll('.emoji-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      actEmojiInput.value = emoji;
    });
    emojiPicker.appendChild(sw);
  });
}

// Auto-select emoji on input typing
if (actNameInput) {
  actNameInput.addEventListener('input', () => {
    const entered = actNameInput.value.trim();
    const guessed = getEmoji(entered);
    if (guessed && guessed !== '✨') {
      const swatches = emojiPicker.querySelectorAll('.emoji-swatch');
      swatches.forEach((sw) => {
        if (sw.textContent === guessed) {
          emojiPicker.querySelectorAll('.emoji-swatch').forEach((s) => s.classList.remove('active'));
          sw.classList.add('active');
          actEmojiInput.value = guessed;
        }
      });
    }
  });
}

const DEFAULT_UNITS = {
  en: ['reps', 'pages', 'minutes', 'times', 'km', 'kg', 'liters'],
  ru: ['повторы', 'страницы', 'минуты', 'раз', 'км', 'кг', 'л']
};

function populateUnitDropdown(selectedUnit = '') {
  if (!actUnitInput) return;
  actUnitInput.textContent = '';
  const list = DEFAULT_UNITS[state.lang] || DEFAULT_UNITS.en;
  list.forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    actUnitInput.appendChild(opt);
  });
  if (selectedUnit && !list.includes(selectedUnit)) {
    const opt = document.createElement('option');
    opt.value = selectedUnit;
    opt.textContent = selectedUnit;
    actUnitInput.appendChild(opt);
  }
  if (selectedUnit) {
    actUnitInput.value = selectedUnit;
  }
}

function openActivityModal(activity = null) {
  if (activity) {
    modalTitle.textContent = t('edit_habit');
    activityIdInput.value = activity.id;
    
    // Parse name and prefix emoji
    const parsed = extractEmojiAndName(activity.name);
    actNameInput.value = parsed.name;
    actEmojiInput.value = parsed.emoji || getEmoji(activity.name);
    
    populateUnitDropdown(activity.unit || '');
    actGoalInput.value = activity.daily_goal || 0;
    actQa1Input.value = activity.quick_add_1 != null ? activity.quick_add_1 : '';
    actQa2Input.value = activity.quick_add_2 != null ? activity.quick_add_2 : '';
    actQa3Input.value = activity.quick_add_3 != null ? activity.quick_add_3 : '';
    state.selectedColor = activity.color || '#0059b5';
    actColorInput.value = state.selectedColor;
    setActivityType(activity.type || 'numeric');
    setCalorieKind(activity.calorie_kind || 'burned');
    actCaloriesInput.value = activity.calories_per_unit != null ? activity.calories_per_unit : '';
    setTrackCalories(!!activity.track_calories);
    deleteActivityBtn.hidden = false;
  } else {
    modalTitle.textContent = t('new_habit');
    activityIdInput.value = '';
    activityForm.reset();
    actEmojiInput.value = '✨';
    populateUnitDropdown('');
    state.selectedColor = '#0059b5';
    actColorInput.value = '#0059b5';
    setActivityType('numeric');
    setCalorieKind('burned');
    actCaloriesInput.value = '';
    setTrackCalories(false);
    deleteActivityBtn.hidden = true;
  }
  initColorPicker();
  initEmojiPicker();
  activityModal.classList.remove('hidden');
}

function closeActivityModal() { activityModal.classList.add('hidden'); }

function openLogModal() {
  logActivitySelect.textContent = '';
  if (!state.activities || state.activities.length === 0) {
    showToast(t('create_habit_first'), 'error');
    return;
  }
  state.activities.forEach((act) => {
    const opt = document.createElement('option');
    opt.value = act.id;
    const cleanName = extractEmojiAndName(act.name).name;
    opt.textContent = act.unit ? `${cleanName} (${act.unit})` : cleanName;
    logActivitySelect.appendChild(opt);
  });
  if (state.selectedActivityId) logActivitySelect.value = state.selectedActivityId;
  logAmountInput.value = '';
  logModal.classList.remove('hidden');
}

function closeLogModal() { logModal.classList.add('hidden'); }

// ==========================================
// 10.5 ТЕМА (Light / Dark)
// ==========================================
const THEME_KEY = 'antigravity-theme';

function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  syncThemeUI();
}

function toggleTheme() {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

// Приводит все переключатели/иконки к текущему состоянию темы
function syncThemeUI() {
  const dark = currentTheme() === 'dark';
  const sideIcon = document.querySelector('#themeToggleSide .material-symbols-outlined');
  if (sideIcon) sideIcon.textContent = dark ? 'light_mode' : 'dark_mode';
  document.querySelectorAll('.theme-switch .knob .material-symbols-outlined').forEach((el) => {
    el.textContent = dark ? 'dark_mode' : 'light_mode';
  });
}

// Строка-переключатель темы для вкладки Activities
function themeToggleRow() {
  const row = document.createElement('div');
  row.className = 'glass-panel rounded-2xl p-4 flex items-center justify-between shadow-sm mb-md';
  const label = document.createElement('div');
  label.innerHTML = `
    <p class="text-label-md font-label-md font-bold">${t('dark_theme')}</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant">${t('appearance_sub')}</p>
  `;
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'theme-switch';
  sw.setAttribute('aria-label', t('theme_switch_aria'));
  const knob = document.createElement('span');
  knob.className = 'knob';
  knob.innerHTML = `<span class="material-symbols-outlined">${currentTheme() === 'dark' ? 'dark_mode' : 'light_mode'}</span>`;
  sw.appendChild(knob);
  sw.addEventListener('click', toggleTheme);
  row.appendChild(label);
  row.appendChild(sw);
  return row;
}

// ==========================================
// 10.6 КОНФИГ АВТОРИЗАЦИИ (Google / Turnstile)
// ==========================================
let turnstileEnabled = false;
let turnstileToken = null;
let turnstileWidgetId = null;

async function loadAuthConfig() {
  let cfg;
  try { cfg = await api.getConfig(); } catch (e) { return; }
  if (cfg.googleEnabled) {
    const g = document.getElementById('googleAuth');
    g.classList.remove('hidden');
    g.classList.add('flex');
  }
  if (cfg.turnstileSiteKey) initTurnstile(cfg.turnstileSiteKey);
}

function initTurnstile(siteKey) {
  turnstileEnabled = true;
  window.__onTurnstileLoad = () => {
    if (!window.turnstile) return;
    turnstileWidgetId = window.turnstile.render('#turnstileBox', {
      sitekey: siteKey,
      theme: 'auto',
      callback: (t) => { turnstileToken = t; },
      'expired-callback': () => { turnstileToken = null; },
      'error-callback': () => { turnstileToken = null; },
    });
  };
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__onTurnstileLoad';
  s.async = true; s.defer = true;
  document.head.appendChild(s);
}

function resetTurnstile() {
  turnstileToken = null;
  if (turnstileEnabled && window.turnstile && turnstileWidgetId !== null) {
    try { window.turnstile.reset(turnstileWidgetId); } catch (e) {}
  }
}

// Ошибка входа через Google приходит как ?auth_error=google
function showAuthErrorFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('auth_error')) {
      showToast(t('google_failed'), 'error');
      u.searchParams.delete('auth_error');
      window.history.replaceState({}, '', u.pathname + u.search);
    }
  } catch (e) {}
}

// ==========================================
// 10.7 УВЕДОМЛЕНИЯ (Колокольчик — мотивация на сегодня)
// ==========================================
const notifModal = document.getElementById('notifModal');

function openNotifModal() {
  const text = document.getElementById('notifText');
  const d = new Date();
  const list = MOTIVATION[state.lang] || MOTIVATION.en;
  const idx = (d.getFullYear() + d.getMonth() + d.getDate()) % list.length;
  if (text) text.textContent = list[idx];
  notifModal.classList.remove('hidden');
}
function closeNotifModal() { notifModal.classList.add('hidden'); }

// ==========================================
// 10.8 GYM MODE (полноэкранная тренировка, UI без БД)
// ==========================================
const gymModal = document.getElementById('gymModal');
const gymExerciseSelect = document.getElementById('gymExerciseSelect');
const gymWeightInput = document.getElementById('gymWeightInput');
const gymRepsInput = document.getElementById('gymRepsInput');
const gymCaloriesInput = document.getElementById('gymCaloriesInput');

// Авто-оценка калорий подхода по весу тела (MET-формула, ACSM): kcal = MET × вес × время.
// Время подхода оценивается от числа повторений (≈4с на повтор, минимум 30с); MET=6 (силовая).
function estimateSetCalories(reps) {
  const w = state.user && state.user.weight;
  if (!(w > 0) || !(reps > 0)) return null;
  const minutes = Math.max(0.5, (reps * 4) / 60);
  return Math.round(6 * w * (minutes / 60));
}
// Живая подсказка: оценка показывается в placeholder поля калорий, пока пользователь не ввёл своё.
function refreshCaloriePlaceholder() {
  const est = estimateSetCalories(parseInt(gymRepsInput.value));
  if (est != null) gymCaloriesInput.placeholder = String(est);
}
if (gymRepsInput) gymRepsInput.addEventListener('input', refreshCaloriePlaceholder);
const gymSetList = document.getElementById('gymSetList');
const gymSetCount = document.getElementById('gymSetCount');
const gymManageBtn = document.getElementById('gymManageBtn');
const gymExerciseManager = document.getElementById('gymExerciseManager');
const exNameInput = document.getElementById('exNameInput');
const exDefWeight = document.getElementById('exDefWeight');
const exDefReps = document.getElementById('exDefReps');
const exDefSets = document.getElementById('exDefSets');
const exDefCalories = document.getElementById('exDefCalories');
const exSaveBtn = document.getElementById('exSaveBtn');
const exCancelBtn = document.getElementById('exCancelBtn');
const exMuscleSelect = document.getElementById('exMuscleSelect');
const gymSetsInput = document.getElementById('gymSetsInput');
const gymAddSetLabel = document.getElementById('gymAddSetLabel');
const exList = document.getElementById('exList');
const exNewBtn = document.getElementById('exNewBtn');
const exFormTitle = document.getElementById('exFormTitle');

// id упражнения, открытого в менеджере на редактирование (null = режим создания нового)
let editingExerciseId = null;

// Базовые имена (для перевода засеянного справочника на русский)
const GYM_EXERCISES = [
  'Bench Press',
  'Barbell Squat',
  'Deadlift',
  'Lat Pulldown',
  'Seated Dumbbell Press',
  'Dumbbell Curl',
  'Pull-ups',
  'Leg Press'
];

// Локализуем плейсхолдеры менеджера упражнений
function syncGymPlaceholders() {
  if (exNameInput) exNameInput.placeholder = t('exercise_name_ph');
  if (exDefWeight) exDefWeight.placeholder = t('def_weight_ph');
  if (exDefReps) exDefReps.placeholder = t('def_reps_ph');
  if (exDefSets) exDefSets.placeholder = t('def_sets_ph');
  if (exDefCalories) exDefCalories.placeholder = t('def_calories_ph');
}

// Наполняем <select> из справочника (value = id упражнения)
function populateExerciseSelect(selectId) {
  gymExerciseSelect.textContent = '';
  state.gymExercises.forEach((ex) => {
    const opt = document.createElement('option');
    opt.value = String(ex.id);
    opt.textContent = translateExercise(ex.name);
    gymExerciseSelect.appendChild(opt);
  });
  if (selectId != null) gymExerciseSelect.value = String(selectId);
}

// Подставляем дефолтные значения выбранного упражнения (пользователь может переписать)
function applyExerciseDefaults() {
  const ex = state.gymExercises.find((e) => String(e.id) === gymExerciseSelect.value);
  if (!ex) return;
  gymWeightInput.value = ex.default_weight != null ? ex.default_weight : '';
  gymRepsInput.value = ex.default_reps != null ? ex.default_reps : '';
  gymCaloriesInput.value = ex.default_calories != null ? ex.default_calories : '';
  gymSetsInput.value = ex.default_sets != null ? ex.default_sets : '';
  updateAddSetLabel();
}

// Сколько подходов добавит кнопка (1..20)
function getSetsCount() {
  let n = parseInt(gymSetsInput.value);
  if (!isFinite(n) || n < 1) n = 1;
  return Math.min(n, 20);
}

// Текст кнопки добавления — «Добавить подход» или «Добавить подходов: N»
function updateAddSetLabel() {
  if (!gymAddSetLabel) return;
  const n = getSetsCount();
  gymAddSetLabel.textContent = n > 1 ? t('add_n_sets', { n }) : t('add_set');
}

async function loadGymExercises(selectId) {
  try {
    const data = await api.getExercises();
    state.gymExercises = data.exercises || [];
  } catch (err) {
    state.gymExercises = [];
    showToast(t('failed_load_exercises'), 'error');
  }
  populateExerciseSelect(selectId);
  applyExerciseDefaults();
}

async function openGymModal() {
  state.gymSets = [];
  gymWeightInput.value = '';
  gymRepsInput.value = '';
  gymCaloriesInput.value = '';
  gymSetsInput.value = '';
  hideExerciseManager();
  syncGymPlaceholders();
  updateAddSetLabel();
  renderGymSets();
  gymModal.classList.remove('hidden');
  await loadGymExercises();
}
function closeGymModal() { gymModal.classList.add('hidden'); }

// ---- менеджер упражнений (редактирование дефолтов существующих + добавление новых) ----

// Заполняем форму менеджера значениями упражнения (или очищаем для нового)
function fillExerciseForm(ex) {
  if (ex) {
    editingExerciseId = ex.id;
    exNameInput.value = ex.name || '';
    exDefWeight.value = ex.default_weight != null ? ex.default_weight : '';
    exDefReps.value = ex.default_reps != null ? ex.default_reps : '';
    exDefSets.value = ex.default_sets != null ? ex.default_sets : '';
    exDefCalories.value = ex.default_calories != null ? ex.default_calories : '';
    exMuscleSelect.value = ex.target_muscle || 'Разное';
    exFormTitle.textContent = t('edit_exercise');
  } else {
    editingExerciseId = null;
    exNameInput.value = '';
    exDefWeight.value = '';
    exDefReps.value = '';
    exDefSets.value = '';
    exDefCalories.value = '';
    exMuscleSelect.value = 'Разное';
    exFormTitle.textContent = t('add_exercise');
  }
}

// Список упражнений в менеджере — клик загружает в форму на редактирование
function renderExerciseList() {
  exList.textContent = '';
  const kg = state.lang === 'ru' ? 'кг' : 'kg';
  state.gymExercises.forEach((ex) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'flex items-center justify-between gap-2 w-full text-left px-3 py-2 rounded-xl hover:bg-primary/5 active:scale-[0.99] transition-all'
      + (String(ex.id) === String(editingExerciseId) ? ' bg-primary/10' : '');
    const sets = ex.default_sets != null ? ex.default_sets : '–';
    const w = ex.default_weight != null ? ex.default_weight : '–';
    const reps = ex.default_reps != null ? ex.default_reps : '–';
    const muscle = ex.target_muscle && ex.target_muscle !== 'Разное' ? ex.target_muscle : '';
    row.innerHTML = `
      <span class="flex items-center gap-2 min-w-0">
        <span class="text-label-md font-label-md font-bold truncate min-w-0">${esc(translateExercise(ex.name))}</span>
        ${muscle ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">${esc(muscle)}</span>` : ''}
      </span>
      <span class="text-label-sm font-label-sm text-on-surface-variant shrink-0">${sets}×${w}${kg} · ${reps}</span>
    `;
    row.addEventListener('click', () => { fillExerciseForm(ex); renderExerciseList(); exNameInput.focus(); });
    exList.appendChild(row);
  });
}

// Открываем менеджер: по умолчанию редактируем текущее выбранное упражнение
function showExerciseManager() {
  syncGymPlaceholders();
  const current = state.gymExercises.find((e) => String(e.id) === gymExerciseSelect.value);
  fillExerciseForm(current || null);
  renderExerciseList();
  gymExerciseManager.classList.remove('hidden');
  exNameInput.focus();
}
function hideExerciseManager() { gymExerciseManager.classList.add('hidden'); }
function toggleExerciseManager() {
  if (gymExerciseManager.classList.contains('hidden')) showExerciseManager();
  else hideExerciseManager();
}

// Сохранение: создаём новое или обновляем редактируемое упражнение
async function saveExercise() {
  const name = exNameInput.value.trim();
  if (!name) { showToast(t('exercise_name_required'), 'error'); return; }
  const payload = {
    name,
    default_weight: exDefWeight.value === '' ? null : Number(exDefWeight.value),
    default_reps: exDefReps.value === '' ? null : parseInt(exDefReps.value),
    default_sets: exDefSets.value === '' ? null : parseInt(exDefSets.value),
    default_calories: exDefCalories.value === '' ? null : Number(exDefCalories.value),
    target_muscle: exMuscleSelect.value,
  };
  try {
    const res = editingExerciseId
      ? await api.updateExercise(editingExerciseId, payload)
      : await api.createExercise(payload);
    hideExerciseManager();
    showToast(t('exercise_saved'));
    const savedId = res && res.exercise ? res.exercise.id : editingExerciseId;
    await loadGymExercises(savedId); // перезагрузим справочник и выберем сохранённое
  } catch (err) {
    showToast(t('failed_save_exercise'), 'error');
  }
}

function renderGymSets() {
  gymSetList.textContent = '';
  gymSetCount.textContent = state.gymSets.length ? `(${state.gymSets.length})` : '';
  if (state.gymSets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-label-sm font-label-sm text-on-surface-variant text-center py-3';
    empty.textContent = t('no_sets');
    gymSetList.appendChild(empty);
    return;
  }
  const kg = state.lang === 'ru' ? 'кг' : 'kg';
  const kcal = state.lang === 'ru' ? 'ккал' : 'kcal';
  state.gymSets.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'gym-set-row';
    const calStr = (s.calories != null && s.calories > 0) ? ` · ${Number(s.calories)} ${kcal}` : '';
    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-sm font-bold shrink-0">${i + 1}</span>
        <div class="min-w-0">
          <p class="text-label-md font-label-md font-bold truncate">${esc(translateExercise(s.exercise))}</p>
          <p class="text-label-sm font-label-sm text-on-surface-variant">${s.weight} ${kg} × ${s.reps}${calStr}</p>
        </div>
      </div>
    `;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-btn shrink-0';
    del.innerHTML = '<span class="material-symbols-outlined text-[20px]">delete</span>';
    del.addEventListener('click', () => { state.gymSets.splice(i, 1); renderGymSets(); });
    row.appendChild(del);
    gymSetList.appendChild(row);
  });
}

function addGymSet() {
  const ex = state.gymExercises.find((e) => String(e.id) === gymExerciseSelect.value);
  const exerciseId = ex ? ex.id : null;
  const exerciseName = ex ? ex.name : gymExerciseSelect.value;
  const weight = parseFloat(gymWeightInput.value);
  const reps = parseInt(gymRepsInput.value);
  if (!isFinite(weight) || weight < 0 || !isFinite(reps) || reps <= 0) {
    showToast(t('enter_weight_reps'), 'error');
    return;
  }
  const calRaw = parseFloat(gymCaloriesInput.value);
  // Ручной ввод имеет приоритет; иначе авто-оценка по весу тела (MET). Без веса — null, как раньше.
  const calories = (isFinite(calRaw) && calRaw >= 0) ? Number(calRaw) : estimateSetCalories(reps);
  const nSets = getSetsCount();
  for (let k = 0; k < nSets; k++) {
    state.gymSets.push({ exercise: exerciseName, exercise_id: exerciseId, weight: Number(weight), reps, calories });
  }
  renderGymSets();
}

async function finishGym() {
  const sets = state.gymSets.slice();
  if (sets.length === 0) {
    showToast(t('add_set_first'), 'error');
    return;
  }
  try {
    const res = await api.saveWorkout(localDay(), sets);
    closeGymModal();
    state.gymSets = [];
    showToast(t('workout_saved', { n: res.count }));
    // Если открыта вкладка Stats в режиме Gym — обновим аналитику
    if (state.activeTab === 'stats' && state.statsMode === 'gym' && !state.selectedActivityId) {
      renderCurrentTab();
    }
  } catch (err) {
    showToast(t('failed_save_workout'), 'error');
  }
}

// ==========================================
// 11. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ==========================================
async function initApp() {
  // Apply initial language from browser/storage immediately to localize static markup before entering
  applyLanguage(state.lang);
  try {
    const res = await api.getMe();
    if (res && res.user) {
      enterApp(res.user);
    } else {
      state.user = null;
      renderAuth();
    }
  } catch (err) {
    state.user = null;
    renderAuth();
  }
}

function enterApp(user) {
  state.user = user;
  userEmailSpan.textContent = user.email;
  userNameSpan.textContent = (user.email || 'Hero').split('@')[0];
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  state.activeTab = 'today';
  state.selectedActivityId = null;
  renderCurrentTab();
}

// Авторизация
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const authError = document.getElementById('authError');
  authError.textContent = '';
  if (turnstileEnabled && !turnstileToken) {
    authError.textContent = t('confirm_robot');
    return;
  }
  try {
    const res = authMode === 'login'
      ? await api.login(email, password, turnstileToken)
      : await api.register(email, password, turnstileToken);
    showToast(authMode === 'login' ? t('welcome_back') : t('account_created'));
    if (res && res.user) enterApp(res.user);
  } catch (err) {
    resetTurnstile();
    authError.textContent = err.message || t('auth_failed');
  }
});

document.getElementById('authTabs').addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  if (!action) return;
  authMode = action === 'login-tab' ? 'login' : 'register';
  renderAuth();
});

// Навигация (сайдбар + нижний таб-бар — все элементы с data-tab)
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const tab = btn.getAttribute('data-tab');
    if (!tab) return;
    state.activeTab = tab;
    state.selectedActivityId = null;
    await renderCurrentTab();
  });
});

// Переключатель темы в сайдбаре
document.getElementById('themeToggleSide').addEventListener('click', toggleTheme);

// Хелпер: безопасная привязка (элемент может отсутствовать)
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// Gym Mode
on('gymModeBtnBar', 'click', openGymModal);
on('gymModeBtnSide', 'click', openGymModal);
on('closeGymBtn', 'click', closeGymModal);
on('gymAddSetBtn', 'click', addGymSet);
on('gymFinishBtn', 'click', finishGym);
// Автозаполнение полей дефолтными значениями выбранного упражнения
on('gymExerciseSelect', 'change', applyExerciseDefaults);
// Кол-во подходов влияет на текст кнопки добавления
on('gymSetsInput', 'input', updateAddSetLabel);
// Менеджер упражнений
on('gymManageBtn', 'click', toggleExerciseManager);
on('exSaveBtn', 'click', saveExercise);
on('exCancelBtn', 'click', hideExerciseManager);
on('exNewBtn', 'click', () => { fillExerciseForm(null); renderExerciseList(); exNameInput.focus(); });

// Колокольчик уведомлений (мобильная шапка + сайдбар)
on('notifBtn', 'click', openNotifModal);
on('notifBtnSide', 'click', openNotifModal);
on('closeNotifBtn', 'click', closeNotifModal);
on('notifOkBtn', 'click', closeNotifModal);

// Выход
async function doLogout() {
  if (!confirm(t('sign_out_confirm'))) return;
  try {
    await api.logout();
    state.user = null;
    state.selectedActivityId = null;
    showToast(t('signed_out_toast'));
    renderAuth();
  } catch (err) {
    showToast(t('failed_sign_out'), 'error');
  }
}
document.getElementById('logoutBtn').addEventListener('click', doLogout);

// Модалки — закрытие
document.getElementById('closeModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('closeLogModalBtn').addEventListener('click', closeLogModal);
document.getElementById('cancelLogModalBtn').addEventListener('click', closeLogModal);

// Закрытие модалок при клике на оверлей (фон)
document.getElementById('activityModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeActivityModal();
});
document.getElementById('logModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLogModal();
});
document.getElementById('notifModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeNotifModal();
});
document.getElementById('gymModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeGymModal();
});


// Закрытие активного модального окна по клавише Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!activityModal.classList.contains('hidden')) closeActivityModal();
    if (!logModal.classList.contains('hidden')) closeLogModal();
    if (!notifModal.classList.contains('hidden')) closeNotifModal();
    if (!gymModal.classList.contains('hidden')) closeGymModal();
  }
});

// Сохранение лога
logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const actId = parseInt(logActivitySelect.value);
  const amount = parseFloat(logAmountInput.value);
  if (isNaN(actId) || isNaN(amount) || amount <= 0) return;
  try {
    await api.addLog(actId, amount, localDay());
    showToast(t('log_added_toast'));
    closeLogModal();
    await renderCurrentTab();
  } catch (err) {
    showToast(t('failed_log_toast'), 'error');
  }
});

// Сохранение привычки
activityForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = activityIdInput.value;
  const cleanName = actNameInput.value.trim();
  if (!cleanName) return;
  
  // Save with emoji prefix
  const selectedEmoji = actEmojiInput.value || '✨';
  const name = `${selectedEmoji} ${cleanName}`;
  
  const type = actTypeInput.value === 'simple' ? 'simple' : 'numeric';
  const numOrNull = (v) => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; };
  const trackCalories = actTrackCaloriesInput.checked;
  const data = {
    name,
    color: actColorInput.value,
    type,
    unit: type === 'simple' ? '' : actUnitInput.value.trim(),
    daily_goal: type === 'simple' ? 1 : (parseFloat(actGoalInput.value) || 0),
    quick_add_1: type === 'simple' ? null : numOrNull(actQa1Input.value),
    quick_add_2: type === 'simple' ? null : numOrNull(actQa2Input.value),
    quick_add_3: type === 'simple' ? null : numOrNull(actQa3Input.value),
    track_calories: trackCalories ? 1 : 0,
    calorie_kind: trackCalories ? (actCalorieKindInput.value === 'saved' ? 'saved' : 'burned') : null,
    calories_per_unit: trackCalories ? numOrNull(actCaloriesInput.value) : null,
  };
  try {
    if (id) {
      await api.updateActivity(id, data);
      showToast(t('habit_updated_toast'));
    } else {
      await api.createActivity(data);
      showToast(t('habit_added_toast'));
    }
    closeActivityModal();
    await renderCurrentTab();
  } catch (err) {
    showToast(t('failed_save_habit'), 'error');
  }
});

// Удаление привычки
deleteActivityBtn.addEventListener('click', async () => {
  const id = activityIdInput.value;
  if (!id) return;
  if (!confirm(t('habit_delete_confirm'))) return;
  try {
    await api.deleteActivity(id);
    showToast(t('habit_deleted_toast'), 'error');
    closeActivityModal();
    if (state.selectedActivityId === parseInt(id)) state.selectedActivityId = null;
    await renderCurrentTab();
  } catch (err) {
    showToast(t('failed_delete_habit'), 'error');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  syncThemeUI();
  showAuthErrorFromUrl();
  loadAuthConfig();
  initApp();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
