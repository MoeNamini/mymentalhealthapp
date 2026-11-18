# retry_worker.py
import os
import re
import time
import json
import requests
import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# --- CONFIGURATION ---
BATCH_LIMIT = 10             # Process up to 10 videos per worker run
MAX_ATTEMPTS = 5            # Move to blacklist & purge from videos after 5 failures
PACING_SLEEP_SECONDS = 5    # Sleep between videos to stay clear of rate limits


# --- DATABASE CONNECTION ---
def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# --- PROMPT & EMBEDDINGS ---
def load_prompt_template() -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), "prompt_template.txt")
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Missing prompt template at: {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def generate_embedding(text: str) -> list:
    """Generates 768-dim vector embeddings via Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not text:
        return None

    model_name = "models/gemini-embedding-001"
    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:embedContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": model_name,
        "content": {"parts": [{"text": text[:2000]}]},
        "outputDimensionality": 768,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()["embedding"]["values"]
    except Exception as e:
        print(f"    ⚠️ Vector embedding generation failed (saving as plain text): {e}")
        return None


# --- AI ACTION EXTRACTION VIA YOUTUBE VIDEO URL ---
def extract_actions_with_gemini(video_url: str, video_title: str, prompt_template: str, gemini_client) -> list:
    filled_prompt = prompt_template.replace("{{video_title}}", video_title)
    filled_prompt = filled_prompt.replace("{{video_url}}", video_url)

    video_part = types.Part.from_uri(
        file_uri=video_url,
        mime_type="video/*"
    )

    response = gemini_client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=[video_part, filled_prompt],
    )

    raw_text = response.text.strip()
    raw_text = re.sub(r"```json\s*", "", raw_text)
    raw_text = re.sub(r"```\s*", "", raw_text)
    raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()

    start = raw_text.find("[")
    end = raw_text.rfind("]") + 1
    if start == -1 or end == 0:
        return []

    try:
        return json.loads(raw_text[start:end])
    except json.JSONDecodeError:
        return []


# --- BLACKLIST & PURGE HELPER ---
def blacklist_and_purge_video(cur, conn, video_db_id: int, youtube_id: str, title: str, channel: str, reason: str):
    """Stores rejected video in blacklisted_videos and deletes the row from videos table."""
    cur.execute(
        """
        INSERT INTO blacklisted_videos (youtube_id, title, channel, reason)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (youtube_id) DO NOTHING;
        """,
        (youtube_id, title, channel, reason)
    )
    cur.execute("DELETE FROM videos WHERE id = %s;", (video_db_id,))
    conn.commit()


# --- WORKER EXECUTION ---
def run_retry_worker():
    print("=" * 60)
    print(f"🔄 Starting Direct URL Retry Worker (Batch Limit: {BATCH_LIMIT} videos)")
    print("=" * 60)

    try:
        prompt_template = load_prompt_template()
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        print("❌ GEMINI_API_KEY is missing from .env")
        return

    gemini_client = genai.Client(api_key=gemini_api_key)
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT v.id, v.youtube_id, v.title, v.channel, v.url, COALESCE(v.ai_attempts, 0)
        FROM videos v
        LEFT JOIN actions a ON a.video_id = v.id
        WHERE a.id IS NULL
        ORDER BY v.ai_attempts ASC, v.id ASC
        LIMIT %s;
        """,
        (BATCH_LIMIT,)
    )
    pending_videos = cur.fetchall()

    if not pending_videos:
        print("✅ No pending videos without actions found. All videos are processed!")
        cur.close()
        conn.close()
        return

    print(f"📋 Found {len(pending_videos)} pending video(s) to process.\n")

    successful_count = 0
    blacklisted_count = 0
    retried_count = 0

    for i, (video_db_id, y_id, title, channel, url, attempts) in enumerate(pending_videos, 1):
        current_attempt = attempts + 1
        video_url = url or f"https://www.youtube.com/watch?v={y_id}"
        print(f"[{i}/{len(pending_videos)}] Video ID {video_db_id} (Attempt {current_attempt}/{MAX_ATTEMPTS}): {title[:55]}")
        print(f"  🎥 Submitting URL to Gemini: {video_url}")

        actions = []
        is_transient_error = False

        try:
            actions = extract_actions_with_gemini(video_url, title, prompt_template, gemini_client)
        except Exception as ai_err:
            err_msg = str(ai_err)
            print(f"  ⚠️ Gemini Processing Error: {err_msg}")
            
            if any(term in err_msg.lower() for term in ["blocked", "private", "not available", "404", "unsupported"]):
                blacklist_and_purge_video(cur, conn, video_db_id, y_id, title, channel, "video_unavailable")
                blacklisted_count += 1
                continue
            else:
                is_transient_error = True

        # Permanent Content Failure
        if not is_transient_error and not actions:
            print("  🚫 0 actions found in content. Blacklisting and deleting from videos table.")
            blacklist_and_purge_video(cur, conn, video_db_id, y_id, title, channel, "zero_actions")
            blacklisted_count += 1
            continue

        # Transient Error Handling
        if is_transient_error:
            if current_attempt >= MAX_ATTEMPTS:
                print(f"  🚫 Failed {MAX_ATTEMPTS} times. Blacklisting and deleting from videos table.")
                blacklist_and_purge_video(cur, conn, video_db_id, y_id, title, channel, "max_attempts_exceeded")
                blacklisted_count += 1
            else:
                cur.execute("UPDATE videos SET ai_attempts = %s WHERE id = %s;", (current_attempt, video_db_id))
                conn.commit()
                retried_count += 1
                print(f"  🔄 Logged attempt {current_attempt}/{MAX_ATTEMPTS}. Will retry on next run.")
            continue

        # Success Path
        try:
            saved_actions = 0
            for act in actions:
                if not act.get("text") or not act.get("benefit"):
                    continue

                combined_text = f"{act['text']}. {act['benefit']}"

                embedding_vector = None
                try:
                    embedding_vector = generate_embedding(combined_text)
                except Exception:
                    embedding_vector = None

                embedding_val = str(embedding_vector) if embedding_vector else None

                cur.execute(
                    """
                    INSERT INTO actions (
                        text, benefit, category, video_id, embedding,
                        times_picked, times_completed, total_rating_points, rating_count, is_active
                    )
                    VALUES (%s, %s, %s, %s, %s, 0, 0, 0, 0, TRUE);
                    """,
                    (
                        act["text"],
                        act["benefit"],
                        act.get("category", "habit_building"),
                        video_db_id,
                        embedding_val
                    )
                )
                saved_actions += 1

            cur.execute("UPDATE videos SET ai_attempts = 0 WHERE id = %s;", (video_db_id,))
            conn.commit()
            successful_count += 1
            print(f"  ✅ SUCCESS: {saved_actions} action(s) stored for Video ID {video_db_id}!")

        except Exception as db_err:
            conn.rollback()
            print(f"  ❌ Failed saving actions to database: {db_err}")

        # Pacing Delay
        print(f"  ⏳ Sleeping {PACING_SLEEP_SECONDS}s to respect rate limits...")
        time.sleep(PACING_SLEEP_SECONDS)

    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print("🏁 Retry Worker Batch Finished:")
    print(f"   Successfully extracted & saved : {successful_count}")
    print(f"   Blacklisted & purged from DB   : {blacklisted_count}")
    print(f"   Transient errors queued        : {retried_count}")
    print("=" * 60)


if __name__ == "__main__":
    run_retry_worker()