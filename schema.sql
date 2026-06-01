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
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT '',
  color      TEXT NOT NULL DEFAULT '#6366f1',
  daily_goal REAL NOT NULL DEFAULT 0,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  amount      REAL NOT NULL,
  day         TEXT NOT NULL,          -- local YYYY-MM-DD (для группировки и streak)
  logged_at   TEXT NOT NULL           -- ISO timestamp
);

-- Счётчики ограничения частоты запросов (rate limiting по IP)
CREATE TABLE IF NOT EXISTS rate_limits (
  k   TEXT PRIMARY KEY,   -- "<scope>:<ip>"
  cnt INTEGER NOT NULL,   -- запросов в текущем окне
  win INTEGER NOT NULL    -- начало окна (unix-секунды)
);

CREATE INDEX IF NOT EXISTS idx_logs_user_day ON logs(user_id, day);
CREATE INDEX IF NOT EXISTS idx_logs_user_act ON logs(user_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_act_user      ON activities(user_id);
