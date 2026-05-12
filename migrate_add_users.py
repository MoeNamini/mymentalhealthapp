# migrate_add_users.py
# Adds all user-related tables to the database.
# Run ONCE with: uv run python migrate_add_users.py

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)
cur = conn.cursor()

# ── Users ──────────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    avatar_url      TEXT,
    auth_provider   TEXT NOT NULL DEFAULT 'email',  -- email | google | twitter
    provider_id     TEXT,                            -- Google/Twitter user ID
    password_hash   TEXT,                            -- NULL for OAuth users
    theme           TEXT NOT NULL DEFAULT 'light',   -- light | dark | soft
    created_at      TIMESTAMP DEFAULT NOW(),
    last_login      TIMESTAMP DEFAULT NOW()
);
""")

# ── Actions picked by each user (personal list) ────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS user_actions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id   INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    picked_at   TIMESTAMP DEFAULT NOW(),
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, action_id)
);
""")

# ── Reminder settings per user per action ─────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS reminders (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id        INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    reminder_type    TEXT NOT NULL,   -- time | button
    frequency_type   TEXT,            -- minute | hour | day  (time reminders only)
    frequency_value  INTEGER,         -- the number the user chose on the wheel
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT NOW()
);
""")

# ── Completion events ──────────────────────────────────────────────────────
# source = 'notification' → saves here only (does NOT touch global actions counter)
# source = 'profile'      → saves here AND increments actions.times_completed globally
cur.execute("""
CREATE TABLE IF NOT EXISTS completion_logs (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id               INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    completed_at            TIMESTAMP DEFAULT NOW(),
    source                  TEXT NOT NULL,   -- notification | profile
    difficulty              TEXT,            -- easy | medium | hard (notification only)
    updates_global_counter  BOOLEAN DEFAULT FALSE
);
""")

# ── Evening check-in responses ("what stopped you?") ──────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS missed_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id   INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    missed_at   TIMESTAMP DEFAULT NOW(),
    response    TEXT
);
""")

# ── Indexes for fast lookups ───────────────────────────────────────────────
cur.execute(
    "CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);"
)
cur.execute(
    "CREATE INDEX IF NOT EXISTS idx_completion_logs_user ON completion_logs(user_id);"
)
cur.execute(
    "CREATE INDEX IF NOT EXISTS idx_completion_logs_action ON completion_logs(action_id);"
)
cur.execute("CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);")

conn.commit()
cur.close()
conn.close()

print("✅ User tables created successfully:")
print("   - users")
print("   - user_actions")
print("   - reminders")
print("   - completion_logs")
print("   - missed_logs")
