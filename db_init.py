import psycopg2
from dotenv import load_dotenv
import os

# Force load from the exact folder this script lives in
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

print("Connecting with:")
print("  host:", os.getenv("DB_HOST"))
print("  db:  ", os.getenv("DB_NAME"))
print("  user:", os.getenv("DB_USER"))

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)

cur = conn.cursor()

# Enable pgvector
cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

# Videos table
cur.execute("""
CREATE TABLE IF NOT EXISTS videos (
    id          SERIAL PRIMARY KEY,
    youtube_id  TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    channel     TEXT,
    url         TEXT NOT NULL,
    duration_s  INTEGER,
    scraped_at  TIMESTAMP DEFAULT NOW()
);
""")

# Transcripts table
cur.execute("""
CREATE TABLE IF NOT EXISTS transcripts (
    id          SERIAL PRIMARY KEY,
    video_id    INTEGER REFERENCES videos(id),
    full_text   TEXT NOT NULL,
    language    TEXT DEFAULT 'en',
    fetched_at  TIMESTAMP DEFAULT NOW()
);
""")

# Actions table — the heart of the app
# embedding column holds 768 floats (nomic-embed-text output size)
cur.execute("""
CREATE TABLE IF NOT EXISTS actions (
    id                  SERIAL PRIMARY KEY,
    text                TEXT NOT NULL,
    benefit             TEXT NOT NULL,
    category            TEXT NOT NULL,
    video_id            INTEGER REFERENCES videos(id),
    transcript_id       INTEGER REFERENCES transcripts(id),
    embedding           vector(768),
    times_picked        INTEGER DEFAULT 0,
    times_completed     INTEGER DEFAULT 0,
    total_rating_points INTEGER DEFAULT 0,
    rating_count        INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);
""")

# Index for fast vector similarity search using cosine distance
cur.execute("""
CREATE INDEX IF NOT EXISTS actions_embedding_idx
ON actions USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);
""")

# Index for fast filtering by category
cur.execute("""
CREATE INDEX IF NOT EXISTS actions_category_idx ON actions(category);
""")

conn.commit()
cur.close()
conn.close()
print("Database initialized successfully.")
