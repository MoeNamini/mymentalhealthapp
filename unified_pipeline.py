# unified_pipeline.py
import os
import re
import math
import time
import json
import argparse
import requests
import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# --- CONFIGURATION ---
CANDIDATE_POOL_SIZE = 15     # Pass 1 candidate volume
TARGET_VETTED_VIDEOS = 3     # Max videos to process per topic run
PACING_SLEEP_SECONDS = 5     # Sleep between videos to stay safely within Gemini rate limits

# Duration boundaries in seconds (10 to 45 minutes)
MIN_DURATION_S = 600
MAX_DURATION_S = 2700


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


# --- UTILITIES ---
def parse_iso8601_duration(duration_str: str) -> int:
    """Parses ISO 8601 duration format (e.g. PT14M32S) to integer seconds."""
    pattern = re.compile(
        r'P(?:(?P<days>\d+)D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?'
    )
    match = pattern.match(duration_str)
    if not match:
        return 0
    parts = match.groupdict()
    days = int(parts['days'] or 0)
    hours = int(parts['hours'] or 0)
    minutes = int(parts['minutes'] or 0)
    seconds = int(parts['seconds'] or 0)
    return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds


def calculate_quality_score(views: int, likes: int, comments: int) -> float:
    """
    Evaluates video quality balancing reach and audience engagement:
    E = ((likes + 4 * comments) / (views + 100)) * 1000
    Quality Score = 0.5 * log10(views + 1) + 0.5 * E
    """
    engagement_ratio = ((likes + (4 * comments)) / (views + 100)) * 1000
    reach_score = math.log10(views + 1)
    return (0.5 * reach_score) + (0.5 * engagement_ratio)


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


# --- PASS 1 & PASS 2: OFFICIAL YOUTUBE API SEARCH & RANK ---
def search_and_rank_youtube(query: str, cur) -> list:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise ValueError("YOUTUBE_API_KEY is missing in .env")

    print(f"\n🔍 Pass 1: Searching YouTube for candidates: '{query}'...")
    search_url = "https://www.googleapis.com/youtube/v3/search"
    search_params = {
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": CANDIDATE_POOL_SIZE,
        "relevanceLanguage": "en",
        "key": api_key,
    }
    resp = requests.get(search_url, params=search_params)
    if resp.status_code != 200:
        print(f"❌ YouTube Search API error: {resp.text}")
        return []

    items = resp.json().get("items", [])
    video_ids = [it["id"]["videoId"] for it in items if "videoId" in it.get("id", {})]
    if not video_ids:
        return []

    print(f"   Fetched {len(video_ids)} raw candidate IDs.")

    # Cross-reference DB to drop existing and blacklisted videos
    cur.execute("SELECT youtube_id FROM videos WHERE youtube_id = ANY(%s);", (video_ids,))
    existing_videos = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT youtube_id FROM blacklisted_videos WHERE youtube_id = ANY(%s);", (video_ids,))
    blacklisted_videos = {r[0] for r in cur.fetchall()}

    fresh_ids = [v_id for v_id in video_ids if v_id not in existing_videos and v_id not in blacklisted_videos]
    print(f"   Retained {len(fresh_ids)} unseen candidates after DB deduplication.")
    if not fresh_ids:
        return []

    # Pass 2: Bulk enrich with statistics and duration
    print("📊 Pass 2: Bulk fetching metrics (views, likes, comments, duration)...")
    videos_url = "https://www.googleapis.com/youtube/v3/videos"
    videos_params = {
        "part": "snippet,statistics,contentDetails",
        "id": ",".join(fresh_ids),
        "key": api_key,
    }
    v_resp = requests.get(videos_url, params=videos_params)
    if v_resp.status_code != 200:
        print(f"❌ YouTube Videos API error: {v_resp.text}")
        return []

    vetted_candidates = []
    for item in v_resp.json().get("items", []):
        v_id = item["id"]
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        details = item.get("contentDetails", {})

        duration_s = parse_iso8601_duration(details.get("duration", "PT0S"))
        if not (MIN_DURATION_S <= duration_s <= MAX_DURATION_S):
            continue

        views = int(stats.get("viewCount", 0))
        likes = int(stats.get("likeCount", 0))
        comments = int(stats.get("commentCount", 0))

        score = calculate_quality_score(views, likes, comments)

        vetted_candidates.append({
            "youtube_id": v_id,
            "title": snippet["title"],
            "channel": snippet["channelTitle"],
            "url": f"https://www.youtube.com/watch?v={v_id}",
            "duration_s": duration_s,
            "views": views,
            "likes": likes,
            "comments": comments,
            "quality_score": score,
        })

    vetted_candidates.sort(key=lambda x: x["quality_score"], reverse=True)
    return vetted_candidates[:TARGET_VETTED_VIDEOS]


# --- AI ACTION EXTRACTION VIA YOUTUBE VIDEO URL ---
def extract_actions_with_gemini(video_url: str, video_title: str, prompt_template: str, gemini_client) -> list:
    """Passes the YouTube URL directly into the prompt and provides the video Part."""
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


# --- MAIN PIPELINE EXECUTION ---
def run_pipeline(topic: str, max_videos: int):
    print("=" * 60)
    print(f"🚀 Launching Direct YouTube Video & AI Action Pipeline")
    print(f"   Topic            : '{topic}'")
    print(f"   Max Ingest Target: {max_videos}")
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

    # Step 1: Search & Rank Candidates
    ranked_videos = search_and_rank_youtube(topic, cur)
    if not ranked_videos:
        print("⚠️ No eligible new videos found matching criteria.")
        cur.close()
        conn.close()
        return

    print(f"\n🎯 Selected Top {len(ranked_videos)} candidate(s) for ingestion:\n")
    for idx, v in enumerate(ranked_videos, 1):
        print(f"  {idx}. [{v['quality_score']:.2f} pts] {v['title'][:55]} | Views: {v['views']:,} | Likes: {v['likes']:,} | Comments: {v['comments']:,}")

    successful_count = 0

    # Step 2: Processing Loop
    for i, video in enumerate(ranked_videos, 1):
        if successful_count >= max_videos:
            print(f"\n🛑 Reached topic run limit ({max_videos} videos). Halting.")
            break

        print(f"\n[{i}/{len(ranked_videos)}] Processing: {video['title'][:60]}")
        y_id = video["youtube_id"]
        video_url = video["url"]

        print(f"  🎥 Submitting video to Gemini: {video_url}")

        actions = []
        is_transient_error = False

        try:
            actions = extract_actions_with_gemini(video_url, video["title"], prompt_template, gemini_client)
        except Exception as ai_err:
            err_msg = str(ai_err)
            print(f"  ⚠️ Gemini Processing Error: {err_msg}")
            
            if any(term in err_msg.lower() for term in ["blocked", "private", "not available", "404", "unsupported"]):
                cur.execute(
                    "INSERT INTO blacklisted_videos (youtube_id, title, channel, reason) VALUES (%s, %s, %s, 'video_unavailable') ON CONFLICT DO NOTHING;",
                    (y_id, video["title"], video["channel"])
                )
                conn.commit()
                continue
            else:
                is_transient_error = True

        # Permanent Content Failure
        if not is_transient_error and not actions:
            print("  ⚠️ Gemini extracted 0 actions (unsuitable content). Moving to blacklist.")
            cur.execute(
                "INSERT INTO blacklisted_videos (youtube_id, title, channel, reason) VALUES (%s, %s, %s, 'zero_actions') ON CONFLICT DO NOTHING;",
                (y_id, video["title"], video["channel"])
            )
            conn.commit()
            continue

        # Transient Failure Handling
        if is_transient_error:
            print("  💾 Saving video metadata with ai_attempts = 1 for retry worker.")
            cur.execute("""
                INSERT INTO videos (youtube_id, title, channel, url, duration_s, ai_attempts)
                VALUES (%s, %s, %s, %s, %s, 1)
                ON CONFLICT (youtube_id) DO UPDATE SET ai_attempts = videos.ai_attempts + 1;
            """, (y_id, video["title"], video["channel"], video["url"], video["duration_s"]))
            conn.commit()
            continue

        # Success Path
        try:
            cur.execute("""
                INSERT INTO videos (youtube_id, title, channel, url, duration_s, ai_attempts)
                VALUES (%s, %s, %s, %s, %s, 0)
                ON CONFLICT (youtube_id) DO UPDATE SET title = EXCLUDED.title
                RETURNING id;
            """, (y_id, video["title"], video["channel"], video["url"], video["duration_s"]))
            video_db_id = cur.fetchone()[0]

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

                cur.execute("""
                    INSERT INTO actions (
                        text, benefit, category, video_id, embedding,
                        times_picked, times_completed, total_rating_points, rating_count, is_active
                    )
                    VALUES (%s, %s, %s, %s, %s, 0, 0, 0, 0, TRUE);
                """, (
                    act["text"],
                    act["benefit"],
                    act.get("category", "habit_building"),
                    video_db_id,
                    embedding_val
                ))
                saved_actions += 1

            conn.commit()
            successful_count += 1
            print(f"  ✅ SUCCESS: Video committed with {saved_actions} action(s) stored!")

        except Exception as db_err:
            conn.rollback()
            print(f"  ❌ Database insertion failed: {db_err}")

        # Pacing Delay
        print(f"  ⏳ Pacing delay: sleeping {PACING_SLEEP_SECONDS}s before next video...")
        time.sleep(PACING_SLEEP_SECONDS)

    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print(f"🏁 Run Completed. Successfully ingested videos: {successful_count}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search YouTube and extract Actions into DB")
    parser.add_argument("--topic", type=str, default=None, help="Search query string (optional)")
    parser.add_argument("--limit", type=int, default=TARGET_VETTED_VIDEOS, help="Max videos to ingest this run")
    args = parser.parse_args()

    topic = args.topic
    if not topic:
        try:
            topic = input("\n🎯 Enter a YouTube search topic (or press Ctrl+C to exit): ").strip()
        except KeyboardInterrupt:
            print("\nExiting.")
            exit(0)

        if not topic:
            print("❌ No topic entered. Exiting.")
            exit(0)

    run_pipeline(topic=topic, max_videos=args.limit)