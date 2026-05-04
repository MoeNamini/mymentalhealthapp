# populator.py
# This script searches YouTube and saves videos + transcripts to your database.
# Run it with: uv run python populator.py

import os
import psycopg2
import requests
from dotenv import load_dotenv
from config import SEARCH_QUERIES, MAX_RESULTS_PER_QUERY, MIN_TRANSCRIPT_LENGTH
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

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


# --- PART 1: Search YouTube for videos ---
def search_youtube(query, max_results):
    print(f"\n🔍 Searching YouTube for: '{query}'")

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": max_results,
        "relevanceLanguage": "en",
        "videoDuration": "medium",
        "key": os.getenv("YOUTUBE_API_KEY"),
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"  ❌ YouTube API error: {response.status_code} — {response.text}")
        return []

    data = response.json()
    videos = []

    for item in data.get("items", []):
        videos.append(
            {
                "youtube_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            }
        )
        print(f"  Found: {item['snippet']['title'][:60]}")

    return videos


# --- PART 2: Save video to database ---
def save_video(cur, video):
    cur.execute(
        """
        INSERT INTO videos (youtube_id, title, channel, url)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (youtube_id) DO NOTHING
        RETURNING id;
        """,
        (video["youtube_id"], video["title"], video["channel"], video["url"]),
    )

    result = cur.fetchone()
    if result:
        print(f"  ✅ Saved new video: {video['title'][:50]}")
        return result[0]
    else:
        cur.execute(
            "SELECT id FROM videos WHERE youtube_id = %s", (video["youtube_id"],)
        )
        existing = cur.fetchone()
        print(f"  ⏭️  Already exists, skipping: {video['title'][:50]}")
        return existing[0]


# --- PART 3: Fetch and save transcript ---
def save_transcript(cur, video_id, youtube_id):
    # Check if we already have a transcript
    cur.execute("SELECT id FROM transcripts WHERE video_id = %s", (video_id,))
    if cur.fetchone():
        print(f"  ⏭️  Transcript already saved, skipping.")
        return

    try:
        import time

        time.sleep(4)

        # Pass the cookies file here
        api = YouTubeTranscriptApi(cookies="cookies.txt")
        fetched_transcript = api.fetch(youtube_id, languages=["en"])

        # THE FIX: New v1.x Syntax
        api = YouTubeTranscriptApi()  # 1. Instantiate the API object

        # 2. Call .fetch() instead of get_transcript()
        fetched_transcript = api.fetch(youtube_id, languages=["en"])

        # 3. Convert the new object type into our familiar list of dictionaries
        transcript_list = fetched_transcript.to_raw_data()

        # Join the text parts into one block
        full_text = " ".join([item["text"] for item in transcript_list])

        if len(full_text) < MIN_TRANSCRIPT_LENGTH:
            print(f"  ⚠️  Transcript too short ({len(full_text)} chars), skipping.")
            return

        # Save to Database
        cur.execute(
            """
            INSERT INTO transcripts (video_id, full_text, language)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (video_id, full_text, "en"),
        )
        print(f"  ✅ Transcript saved ({len(full_text)} characters)")

    except Exception as e:
        # Catches cases where transcripts are disabled by the creator
        print(f"  ⚠️  Could not get transcript for {youtube_id}: {e}")


# --- MAIN: Run everything in sequence ---
def run_populator():
    print("🚀 Starting populator...")
    conn = get_db_connection()
    cur = conn.cursor()

    total_videos = 0
    total_transcripts = 0

    for query in SEARCH_QUERIES:
        videos = search_youtube(query, MAX_RESULTS_PER_QUERY)

        for video in videos:
            video_id = save_video(cur, video)
            conn.commit()  # save the video before fetching transcript

            save_transcript(cur, video_id, video["youtube_id"])
            conn.commit()  # save the transcript
            total_videos += 1

    # Count what we have in the database now
    cur.execute("SELECT COUNT(*) FROM videos")
    total_videos = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM transcripts")
    total_transcripts = cur.fetchone()[0]

    print(f"\n✅ Populator finished!")
    print(f"   Total videos in database: {total_videos}")
    print(f"   Total transcripts in database: {total_transcripts}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    run_populator()
