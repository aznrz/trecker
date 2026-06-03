-- trecker schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT UNIQUE NOT NULL,
  pass_hash  TEXT NOT NULL,
  google_id  TEXT,                  -- для входа через Google (NULL у обычных аккаунтов)
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);

CREATE TABLE IF NOT EXISTS activities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#0059b5',
  daily_goal  REAL NOT NULL DEFAULT 0,
  type        TEXT NOT NULL DEFAULT 'numeric',  -- 'numeric' | 'simple' (разовая/бинарная)
  quick_add_1 REAL,                              -- значения кнопок быстрого ввода (NULL = нет кнопки)
  quick_add_2 REAL,
  quick_add_3 REAL,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  amount      REAL NOT NULL,
  day         TEXT NOT NULL,          -- local YYYY-MM-DD (для группировки и streak)
  logged_at   TEXT NOT NULL           -- ISO timestamp
);

-- Gym Mode: упражнения (справочник на пользователя) и подходы.
-- Структура BI-ready: плоский JOIN workout_sets × exercises по exercise_id.
CREATE TABLE IF NOT EXISTS exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  name             TEXT NOT NULL,
  default_sets     INTEGER,                -- дефолтное число подходов (NULL = не задано)
  default_reps     INTEGER,                -- дефолтные повторения
  default_weight   REAL,                   -- дефолтный рабочий вес, кг
  default_calories REAL,                   -- дефолтные калории за подход
  target_muscle    TEXT NOT NULL DEFAULT 'Разное',  -- группа мышц (для аналитики)
  created_at       TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  weight      REAL NOT NULL,          -- кг
  reps        INTEGER NOT NULL,       -- повторения
  calories    REAL,                   -- калории за подход (NULL = не задано)
  day         TEXT NOT NULL,          -- local YYYY-MM-DD (как logs.day)
  logged_at   TEXT NOT NULL           -- ISO timestamp
);

-- Счётчики ограничения частоты запросов (rate limiting по IP)
CREATE TABLE IF NOT EXISTS rate_limits (
  k   TEXT PRIMARY KEY,   -- "<scope>:<ip>"
  cnt INTEGER NOT NULL,   -- запросов в текущем окне
  win INTEGER NOT NULL    -- начало окна (unix-секунды)
);

CREATE INDEX IF NOT EXISTS idx_logs_user_day  ON logs(user_id, day);
CREATE INDEX IF NOT EXISTS idx_logs_user_act  ON logs(user_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_act_user       ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_wsets_user_day ON workout_sets(user_id, day);
CREATE INDEX IF NOT EXISTS idx_wsets_user_ex  ON workout_sets(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_ex_user        ON exercises(user_id);
