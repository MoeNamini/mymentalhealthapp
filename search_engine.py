# search_engine.py
# The core search engine for the app.
# Takes a user's text query, converts it to a vector,
# searches the database semantically, ranks results,
# and returns structured data ready for the UI.
#
# Usage from another script:
#   from search_engine import search_actions
#   results = search_actions("I feel anxious and can't focus")

import os
import psycopg2
import ollama
from dotenv import load_dotenv

load_dotenv()

# --- Ranking weights — must add up to 1.0 ---
WEIGHT_SEMANTIC = 0.50  # how closely meaning matches the query
WEIGHT_POPULARITY = 0.25  # based on times_picked
WEIGHT_RATING = 0.15  # based on average user rating
WEIGHT_DIFFICULTY = 0.10  # easier actions score slightly higher by default

# --- How many results to fetch from DB before re-ranking ---
# We fetch more than we return so the ranking has enough to work with
CANDIDATE_POOL_SIZE = 40

# --- Default number of results to return to the UI ---
DEFAULT_RESULT_LIMIT = 10


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def embed_query(query_text):
    """
    Converts the user's search text into a 768-number vector
    using the local nomic-embed-text model via Ollama.
    This vector represents the *meaning* of the query.
    """
    response = ollama.embed(
        model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
        input=query_text,
    )
    return response["embeddings"][0]


def fetch_candidates(cur, query_vector, pool_size):
    """
    Asks PostgreSQL to find the most semantically similar actions
    using pgvector's cosine distance operator (<=>) .
    Returns raw rows from the database before ranking.
    """
    cur.execute(
        """
        SELECT
            a.id,
            a.text,
            a.benefit,
            a.category,
            a.difficulty,
            a.times_picked,
            a.times_completed,
            a.total_rating_points,
            a.rating_count,
            v.url            AS video_url,
            v.title          AS video_title,
            v.youtube_id,
            1 - (a.embedding <=> %s::vector) AS semantic_score
        FROM actions a
        JOIN videos v ON v.id = a.video_id
        WHERE a.is_active = TRUE
          AND a.embedding IS NOT NULL
        ORDER BY a.embedding <=> %s::vector
        LIMIT %s;
    """,
        (str(query_vector), str(query_vector), pool_size),
    )

    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def normalize(value, min_val, max_val):
    """
    Scales any number to a 0-1 range.
    For example, a rating of 4 out of 5 becomes 0.8.
    Returns 0 if there's no range to normalize against.
    """
    if max_val == min_val:
        return 0.0
    return (value - min_val) / (max_val - min_val)


def rank_results(candidates):
    """
    Takes the raw database results and re-orders them using the
    weighted ranking formula combining semantic similarity,
    popularity, rating, and difficulty.
    """
    if not candidates:
        return []

    # Find min/max values across all candidates so we can normalize fairly
    max_picked = max(c["times_picked"] for c in candidates) or 1
    min_picked = min(c["times_picked"] for c in candidates)

    # Calculate avg rating for each candidate (avoid division by zero)
    for c in candidates:
        if c["rating_count"] and c["rating_count"] > 0:
            c["avg_rating"] = c["total_rating_points"] / c["rating_count"]
        else:
            c["avg_rating"] = 0.0

    max_rating = max(c["avg_rating"] for c in candidates) or 1
    min_rating = min(c["avg_rating"] for c in candidates)

    # Score each candidate
    for c in candidates:
        semantic_score = float(c["semantic_score"])
        popularity_score = normalize(c["times_picked"], min_picked, max_picked)
        rating_score = normalize(c["avg_rating"], min_rating, max_rating)

        # Difficulty: difficulty=1 is easiest → scores 1.0, difficulty=5 → scores 0.0
        difficulty_val = c.get("difficulty") or 1
        difficulty_score = 1.0 - ((difficulty_val - 1) / 4)

        c["final_score"] = (
            semantic_score * WEIGHT_SEMANTIC
            + popularity_score * WEIGHT_POPULARITY
            + rating_score * WEIGHT_RATING
            + difficulty_score * WEIGHT_DIFFICULTY
        )

    # Sort by final score, highest first
    ranked = sorted(candidates, key=lambda x: x["final_score"], reverse=True)
    return ranked


def format_results(ranked, limit):
    """
    Cleans up the result objects before sending to the UI.
    Removes internal fields, formats the YouTube embed URL,
    and rounds numbers for readability.
    Returns only the top N results.
    """
    output = []

    for item in ranked[:limit]:
        # Build the YouTube embed URL from the video ID
        embed_url = f"https://www.youtube.com/embed/{item['youtube_id']}"
        watch_url = item["video_url"]

        output.append(
            {
                "id": item["id"],
                "text": item["text"],
                "benefit": item["benefit"],
                "category": item["category"],
                "difficulty": item.get("difficulty", 1),
                "video_url": watch_url,  # full YouTube link
                "embed_url": embed_url,  # for embedding in UI
                "video_title": item["video_title"],
                "times_picked": item["times_picked"],
                "times_completed": item["times_completed"],
                "avg_rating": round(item["avg_rating"], 2),
                "relevance": round(float(item["semantic_score"]), 3),
                "final_score": round(item["final_score"], 3),
            }
        )

    return output


def search_actions(query_text, limit=DEFAULT_RESULT_LIMIT, category_filter=None):
    """
    Main function — the only one you need to call from outside this file.

    Parameters:
        query_text      : the user's search string (e.g. "I feel anxious")
        limit           : how many results to return (default 10)
        category_filter : optional string to filter by category
                          e.g. "sleep", "movement", "mindfulness"
                          pass None to search all categories

    Returns a list of dicts, each containing:
        id, text, benefit, category, difficulty,
        video_url, embed_url, video_title,
        times_picked, times_completed, avg_rating,
        relevance, final_score
    """
    if not query_text or not query_text.strip():
        return []

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Step 1: Convert the query to a vector
        print(f"  🔍 Embedding query: '{query_text}'")
        query_vector = embed_query(query_text)

        # Step 2: Fetch semantic candidates from DB
        candidates = fetch_candidates(cur, query_vector, CANDIDATE_POOL_SIZE)

        if not candidates:
            print("  ⚠️  No results found in database")
            return []

        # Step 3: Apply category filter if provided
        if category_filter:
            candidates = [
                c
                for c in candidates
                if c["category"].lower() == category_filter.lower()
            ]
            if not candidates:
                print(f"  ⚠️  No results found for category: {category_filter}")
                return []

        # Step 4: Rank the candidates
        ranked = rank_results(candidates)

        # Step 5: Format and return top results
        results = format_results(ranked, limit)
        print(f"  ✅ Returning {len(results)} ranked results")
        return results

    finally:
        cur.close()
        conn.close()
