# processor_gemini.py
# This script reads transcripts from the database, sends them to Gemini API,
# extracts actions, and saves them back into the actions table.
#
# Differences from processor.py:
#   - Uses Gemini cloud API instead of local Ollama for action extraction
#   - Reads the prompt from an external file (prompt_template.txt)
#     so you can edit the prompt without touching this script
#   - Still uses local Ollama (nomic-embed-text) for generating embeddings
#     because embeddings stay local and don't need a cloud model
#
# Run it with: uv run python processor_gemini.py

import os
import json
import time
import re
import psycopg2
import ollama
from dotenv import load_dotenv
from google import genai

load_dotenv()


# --- Load the prompt template from the external file ---
def load_prompt_template():
    """
    Reads prompt_template.txt from the same folder as this script.
    This file contains the instructions we send to Gemini.
    If the file is missing, the script stops and tells you clearly.
    """
    prompt_path = os.path.join(os.path.dirname(__file__), "prompt_template.txt")

    if not os.path.exists(prompt_path):
        raise FileNotFoundError(
            f"prompt_template.txt not found at: {prompt_path}\n"
            "Please create this file before running the processor."
        )

    with open(prompt_path, "r", encoding="utf-8") as f:
        template = f.read()

    print(f"✅ Prompt template loaded ({len(template)} characters)")
    return template


# --- Connect to the database ---
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# --- PART 1: Send transcript to Gemini and get actions back ---
def extract_actions_with_gemini(
    transcript_text, video_title, prompt_template, gemini_client
):
    """
    Fills in the prompt template with the actual video title and transcript,
    then sends it to Gemini and returns the raw text response.

    The prompt template uses two placeholders:
      {{video_title}}      — replaced with the actual video title
      {{transcript_text}}  — replaced with the transcript (trimmed to 6000 chars)
    """

    # Trim transcript to avoid exceeding Gemini's context limits
    trimmed_text = transcript_text[:6000]

    # Fill in the placeholders in the template
    filled_prompt = prompt_template.replace("{{video_title}}", video_title)
    filled_prompt = filled_prompt.replace("{{transcript_text}}", trimmed_text)

    # Send to Gemini
    response = gemini_client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        contents=filled_prompt,
    )

    return response.text


# --- PART 2: Clean and parse the JSON response from Gemini ---
def parse_actions(raw_response):
    """
    Gemini sometimes wraps JSON in markdown code fences like ```json ... ```
    or adds explanation text before/after the array.
    This function strips all of that and returns a clean Python list.
    """
    text = raw_response.strip()

    # Remove markdown code fences if present (```json ... ``` or ``` ... ```)
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    # Remove <think>...</think> blocks (some models add reasoning traces)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)

    text = text.strip()

    # Find the JSON array between the first [ and last ]
    start = text.find("[")
    end = text.rfind("]") + 1

    if start == -1 or end == 0:
        print(f"  ⚠️  Could not find a JSON array in Gemini's response")
        print(f"  Response preview: {text[:300]}")
        return []

    json_str = text[start:end]

    try:
        actions = json.loads(json_str)
        return actions
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parsing failed: {e}")
        print(f"  Problematic JSON preview: {json_str[:300]}")
        return []


# --- PART 3: Generate a meaning vector using local Ollama ---
def generate_embedding(text):
    """
    Converts text into a 768-number vector representing its meaning.
    This runs locally using nomic-embed-text via Ollama — no cloud needed.
    We embed both the action text and benefit together for richer search results.
    """
    response = ollama.embed(
        model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
        input=text,
    )
    return response["embeddings"][0]


# --- PART 4: Save one action to the database ---
def save_action(cur, action, video_id, transcript_id):
    """
    Inserts one action into the actions table.
    Skips it silently if the exact same action already exists for this video
    (prevents duplicates if you run the processor more than once).
    """
    # Duplicate check
    cur.execute(
        """
        SELECT id FROM actions
        WHERE text = %s AND video_id = %s
    """,
        (action["text"], video_id),
    )

    if cur.fetchone():
        print(f"    ⏭️  Already exists, skipping: {action['text'][:50]}")
        return False

    # Generate embedding from action text + benefit combined
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
    print("🤖 Starting Gemini processor...")
    print(f"   Gemini model : {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')}")
    print(
        f"   Embed model  : {os.getenv('EMBEDDING_MODEL', 'nomic-embed-text')} (local)\n"
    )

    # Step A: Load the prompt template file
    try:
        prompt_template = load_prompt_template()
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return

    # Step B: Set up the Gemini client
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        print("❌ GEMINI_API_KEY is missing from your .env file. Add it and try again.")
        return

    gemini_client = genai.Client(api_key=gemini_api_key)
    print("✅ Gemini client connected\n")

    # Step C: Connect to the database
    conn = get_db_connection()
    cur = conn.cursor()

    # Step D: Find all transcripts not yet processed
    # A transcript is considered processed if its video already has actions saved
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

        cur.execute("SELECT COUNT(*) FROM actions")
        count = cur.fetchone()[0]
        print(f"   Total actions in database: {count}")

        cur.close()
        conn.close()
        return

    print(f"📋 Found {len(transcripts)} unprocessed transcript(s)\n")

    total_saved = 0
    total_failed = 0

    for i, (transcript_id, video_id, full_text, video_title) in enumerate(
        transcripts, 1
    ):
        print(f"[{i}/{len(transcripts)}] {video_title[:65]}")

        # Send to Gemini
        print(f"  ☁️  Sending to Gemini...")
        try:
            raw_response = extract_actions_with_gemini(
                full_text, video_title, prompt_template, gemini_client
            )
        except Exception as e:
            print(f"  ❌ Gemini API error: {e}")
            continue

        # Parse the response
        actions = parse_actions(raw_response)

        if not actions:
            print(f"  ⚠️  No valid actions extracted, skipping this transcript")
            continue

        print(f"  ✅ Gemini returned {len(actions)} actions — saving...")

        saved_this_video = 0

        for action in actions:
            # Make sure the action has the required fields
            if not action.get("text") or not action.get("benefit"):
                print(f"    ⚠️  Skipping incomplete action: {action}")
                continue

            try:
                success = save_action(cur, action, video_id, transcript_id)
                if success:
                    saved_this_video += 1
                    total_saved += 1
                    print(f"    💾 {action['text'][:65]}")
            except Exception as e:
                print(f"    ❌ Failed to save: {e}")
                total_failed += 1

        conn.commit()  # commit all actions for this transcript at once
        print(f"  ✅ Saved {saved_this_video} actions\n")

        # Small pause between requests to stay within Gemini's rate limits
        if i < len(transcripts):
            time.sleep(1)

    # Final summary
    cur.execute("SELECT COUNT(*) FROM actions")
    total_in_db = cur.fetchone()[0]

    print("=" * 55)
    print(f"✅ Processor finished!")
    print(f"   Actions saved this run : {total_saved}")
    print(f"   Failed actions         : {total_failed}")
    print(f"   Total actions in DB    : {total_in_db}")
    print("=" * 55)

    cur.close()
    conn.close()


if __name__ == "__main__":
    run_processor()
