# processor.py
# This script reads transcripts from the database, sends them to Ollama,
# extracts actions, and saves them back to the database.
# Run it with: uv run python processor.py

import os
import json
import time
import psycopg2
import ollama
from dotenv import load_dotenv

load_dotenv()


# --- Connect to the database ---
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# --- PART 1: Ask Ollama to extract actions from a transcript ---
def extract_actions_from_transcript(transcript_text, video_title):
    """
    Sends the transcript to qwen3-vl:8b and asks it to return
    a list of concrete actions in JSON format.
    """

    # Trim transcript to avoid overloading the model's context window
    # qwen3:8b can handle a lot but let's keep it focused
    trimmed_text = transcript_text[:6000]

    prompt = f"""You are an expert life coach and behavioral psychologist.
Read the following YouTube video transcript carefully.
Your job is to extract concrete, actionable advice from it.

VIDEO TITLE: {video_title}

RULES FOR EACH ACTION:
- Must be something a person can physically DO today
- Must be specific, not vague (e.g. "Set a 5-minute timer and meditate" not "meditate more")
- Must be a complete sentence starting with a verb
- Good examples: "Go for a 10-minute walk after lunch", "Write down 3 things you are grateful for before bed", "Put your phone in another room 1 hour before sleeping"
- Bad examples: "Be more mindful", "Exercise", "Improve your habits"

For each action also identify:
- benefit: one clear sentence on what problem this action solves or what it helps with
- category: choose ONLY from this list: [movement, nutrition, mindfulness, sleep, social, environment, focus, habit_building]

TRANSCRIPT:
{trimmed_text}

Respond ONLY with a valid JSON array. No explanation, no intro text, just the JSON.
Example format:
[
  {{
    "text": "Set your phone to Do Not Disturb at 9pm every night",
    "benefit": "Reduces screen time before bed and improves sleep quality",
    "category": "sleep"
  }},
  {{
    "text": "Drink a full glass of water immediately after waking up",
    "benefit": "Rehydrates the body and helps start the day with energy",
    "category": "nutrition"
  }}
]

Extract between 5 and 10 actions. Only include actions that are clearly supported by the transcript.
"""

    response = ollama.chat(
        model=os.getenv("LOCAL_LLM_MODEL", "qwen3-vl:8b"),
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.3},  # lower = more focused and consistent output
    )

    return response["message"]["content"]


# --- PART 2: Clean and parse the JSON response from Ollama ---
def parse_actions(raw_response):
    """
    Ollama sometimes adds extra text around the JSON.
    This function finds and extracts just the JSON array.
    """
    text = raw_response.strip()

    # Remove <think>...</think> blocks that qwen3 sometimes adds
    import re

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Find the JSON array — look for content between [ and ]
    start = text.find("[")
    end = text.rfind("]") + 1

    if start == -1 or end == 0:
        print(f"  ⚠️  Could not find JSON array in response")
        print(f"  Raw response preview: {text[:200]}")
        return []

    json_str = text[start:end]

    try:
        actions = json.loads(json_str)
        return actions
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parsing failed: {e}")
        print(f"  Problematic JSON preview: {json_str[:200]}")
        return []


# --- PART 3: Generate a meaning vector for an action ---
def generate_embedding(text):
    """
    Converts text into a list of numbers (vector) that represents its meaning.
    This is what powers the semantic search feature.
    We combine the action text + benefit so the search captures full meaning.
    """
    response = ollama.embed(
        model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text"), input=text
    )
    return response["embeddings"][0]


# --- PART 4: Save a single action to the database ---
def save_action(cur, action, video_id, transcript_id):
    """
    Saves one action to the actions table.
    Skips if the exact same action text already exists for this video.
    """
    # Check for duplicates — same text for the same video
    cur.execute(
        """
        SELECT id FROM actions
        WHERE text = %s AND video_id = %s
    """,
        (action["text"], video_id),
    )

    if cur.fetchone():
        print(f"    ⏭️  Action already exists, skipping: {action['text'][:50]}")
        return False

    # Generate the embedding for this action
    # We embed both text + benefit together for richer semantic meaning
    combined_text = f"{action['text']}. {action['benefit']}"
    embedding = generate_embedding(combined_text)

    cur.execute(
        """
        INSERT INTO actions (
            text, benefit, category,
            video_id, transcript_id,
            embedding,
            times_picked, times_completed,
            total_rating_points, rating_count,
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 0, 0, TRUE)
        RETURNING id;
    """,
        (
            action["text"],
            action["benefit"],
            action.get("category", "habit_building"),
            video_id,
            transcript_id,
            str(embedding),
        ),
    )

    return True


# --- MAIN: Process all unprocessed transcripts ---
def run_processor():
    print("🤖 Starting processor...")
    print(f"   Using model: {os.getenv('LOCAL_LLM_MODEL', 'qwen3-vl:8b')}\n")

    conn = get_db_connection()
    cur = conn.cursor()

    # Find all transcripts that have NOT been processed yet
    # A transcript is "processed" if at least one action exists for its video
    cur.execute("""
        SELECT t.id, t.video_id, t.full_text, v.title
        FROM transcripts t
        JOIN videos v ON v.id = t.video_id
        WHERE t.video_id NOT IN (
            SELECT DISTINCT video_id FROM actions
        )
        ORDER BY t.id;
    """)

    transcripts = cur.fetchall()

    if not transcripts:
        print("✅ All transcripts have already been processed!")
        print("   If you want to re-process, delete rows from the actions table first.")

        # Show current stats
        cur.execute("SELECT COUNT(*) FROM actions")
        count = cur.fetchone()[0]
        print(f"   Total actions currently in database: {count}")
        cur.close()
        conn.close()
        return

    print(f"📋 Found {len(transcripts)} transcript(s) to process\n")

    total_actions_saved = 0
    total_actions_failed = 0

    for i, (transcript_id, video_id, full_text, video_title) in enumerate(
        transcripts, 1
    ):
        print(f"[{i}/{len(transcripts)}] Processing: {video_title[:60]}")

        # Step A: Send to Ollama
        print(f"  🧠 Sending to Ollama...")
        try:
            raw_response = extract_actions_from_transcript(full_text, video_title)
        except Exception as e:
            print(f"  ❌ Ollama failed: {e}")
            continue

        # Step B: Parse the JSON response
        actions = parse_actions(raw_response)

        if not actions:
            print(f"  ⚠️  No valid actions extracted, skipping this transcript")
            continue

        print(f"  ✅ Ollama extracted {len(actions)} actions — saving to database...")

        # Step C: Save each action
        saved = 0
        for action in actions:
            try:
                # Validate the action has required fields
                if not action.get("text") or not action.get("benefit"):
                    print(f"    ⚠️  Skipping malformed action: {action}")
                    continue

                success = save_action(cur, action, video_id, transcript_id)
                if success:
                    saved += 1
                    print(f"    💾 Saved: {action['text'][:60]}")

            except Exception as e:
                print(f"    ❌ Failed to save action: {e}")
                total_actions_failed += 1

        conn.commit()  # save all actions for this transcript at once
        total_actions_saved += saved
        print(f"  ✅ Saved {saved} actions for this video\n")

        # Small pause between transcripts so Ollama doesn't get overwhelmed
        if i < len(transcripts):
            time.sleep(1)

    # Final summary
    cur.execute("SELECT COUNT(*) FROM actions")
    total_in_db = cur.fetchone()[0]

    print("=" * 50)
    print(f"✅ Processor finished!")
    print(f"   Actions saved this run: {total_actions_saved}")
    print(f"   Failed actions: {total_actions_failed}")
    print(f"   Total actions in database: {total_in_db}")
    print("=" * 50)

    cur.close()
    conn.close()


if __name__ == "__main__":
    run_processor()
