# migrate_add_milestones.py
# Adds the milestone_logs table.
# Run ONCE with: uv run python migrate_add_milestones.py

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

# Each row = one user hitting one milestone on one action
# The UNIQUE constraint ensures the popup only shows once per milestone
cur.execute("""
CREATE TABLE IF NOT EXISTS milestone_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id    INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    milestone    INTEGER NOT NULL,        -- 7, 30, or 90
    achieved_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, action_id, milestone) -- one record per user per action per milestone
);
""")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_milestone_logs_user
ON milestone_logs(user_id);
""")

conn.commit()
cur.close()
conn.close()
print("✅ milestone_logs table created successfully")
