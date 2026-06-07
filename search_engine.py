import os
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

# --- Ranking weights ---
WEIGHT_SEMANTIC = 0.50  
WEIGHT_POPULARITY = 0.25  
WEIGHT_RATING = 0.15  
WEIGHT_DIFFICULTY = 0.10  

CANDIDATE_POOL_SIZE = 40
DEFAULT_RESULT_LIMIT = 10

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def embed_query(query_text):
    if not query_text:
        return []
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ CRITICAL: GEMINI_API_KEY is missing!")
        return []

    model_name = "models/gemini-embedding-001"
    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:embedContent?key={api_key}"
    
    headers = {'Content-Type': 'application/json'}
    data = {
        "model": model_name,
        "content": {"parts": [{"text": query_text}]},
        "outputDimensionality": 768
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status() 
        return response.json()['embedding']['values']
    except Exception as e:
        print(f"❌ Gemini Vector Search Error: {e}")
        return []

def fetch_candidates(cur, query_vector, pool_size, category_filter=None):
    vector_str = str(query_vector)
    
    # [Fix 4] Apply category_filter directly in the SQL query for consistency
    if category_filter:
        cur.execute(
            """
            SELECT
                a.id, a.text, a.benefit, a.category, a.difficulty,
                a.times_picked, a.times_completed, a.total_rating_points,
                a.rating_count, v.url AS video_url, v.title AS video_title,
                v.youtube_id,
                1 - (a.embedding <=> %s::vector) AS semantic_score
            FROM actions a
            LEFT JOIN videos v ON v.id = a.video_id
            WHERE a.is_active = TRUE
              AND a.embedding IS NOT NULL
              AND a.category = %s
            ORDER BY a.embedding <=> %s::vector
            LIMIT %s;
        """,
            (vector_str, category_filter, vector_str, pool_size),
        )
    else:
        cur.execute(
            """
            SELECT
                a.id, a.text, a.benefit, a.category, a.difficulty,
                a.times_picked, a.times_completed, a.total_rating_points,
                a.rating_count, v.url AS video_url, v.title AS video_title,
                v.youtube_id,
                1 - (a.embedding <=> %s::vector) AS semantic_score
            FROM actions a
            LEFT JOIN videos v ON v.id = a.video_id
            WHERE a.is_active = TRUE
              AND a.embedding IS NOT NULL
            ORDER BY a.embedding <=> %s::vector
            LIMIT %s;
        """,
            (vector_str, vector_str, pool_size),
        )
        
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in cur.fetchall()]

def normalize(value, min_val, max_val):
    if max_val == min_val: return 0.0
    return (value - min_val) / (max_val - min_val)

def rank_results(candidates):
    if not candidates: return []
    max_picked = max(c["times_picked"] for c in candidates)
    min_picked = min(c["times_picked"] for c in candidates)
    
    for c in candidates:
        # [Fix 2] Safe handling of NULL values for total_rating_points
        points = c.get("total_rating_points") or 0
        count = c.get("rating_count") or 0
        c["avg_rating"] = (points / count) if count > 0 else 0.0
        
        # [Fix 1] Ensure text fallback items have a semantic score
        if "semantic_score" not in c or c["semantic_score"] is None:
            c["semantic_score"] = 0.5
            
    max_rating = max(c["avg_rating"] for c in candidates)
    min_rating = min(c["avg_rating"] for c in candidates)
    
    for c in candidates:
        semantic_score = float(c["semantic_score"])
        popularity_score = normalize(c["times_picked"], min_picked, max_picked)
        rating_score = normalize(c["avg_rating"], min_rating, max_rating)
        
        # [Fix 3] Safely clamp difficulty between 1 and 5
        diff_val = max(1, min(5, c.get("difficulty") or 1))
        difficulty_score = 1.0 - ((diff_val - 1) / 4)
        
        c["final_score"] = (semantic_score * WEIGHT_SEMANTIC) + (popularity_score * WEIGHT_POPULARITY) + (rating_score * WEIGHT_RATING) + (difficulty_score * WEIGHT_DIFFICULTY)
        
    return sorted(candidates, key=lambda x: x["final_score"], reverse=True)

def format_results(ranked, limit):
    output = []
    for item in ranked[:limit]:
        embed_url = f"https://www.youtube.com/embed/{item['youtube_id']}" if item.get("youtube_id") else None
        output.append({
            "id": item["id"], "text": item["text"], "benefit": item["benefit"],
            "category": item["category"], "difficulty": item.get("difficulty", 1),
            "video_url": item.get("video_url"), "embed_url": embed_url,
            "video_title": item.get("video_title"), "times_picked": item["times_picked"],
            "times_completed": item["times_completed"], "avg_rating": round(item.get("avg_rating", 0.0), 2),
            "relevance": round(float(item.get("semantic_score", 0.5)), 3),
            "final_score": round(item.get("final_score", 0.5), 3),
        })
    return output

def search_actions(query_text, limit=DEFAULT_RESULT_LIMIT, category_filter=None):
    if not query_text or not query_text.strip():
        return []

    conn = get_db_connection()
    cur = conn.cursor()

    # [Fix 5] Dynamically scale candidate pool
    pool_size = max(CANDIDATE_POOL_SIZE, limit * 4)

    try:
        query_vector = embed_query(query_text)
        
        if not query_vector:
            print("⚠️ Gemini Failed! Falling back to standard Text Search.")
            if category_filter:
                cur.execute(
                    "SELECT a.id, a.text, a.benefit, a.category, a.difficulty, a.times_picked, a.times_completed, a.total_rating_points, a.rating_count, v.url AS video_url, v.title AS video_title, v.youtube_id FROM actions a LEFT JOIN videos v ON v.id = a.video_id WHERE a.is_active = TRUE AND a.category = %s AND (a.text ILIKE %s OR a.benefit ILIKE %s) LIMIT %s",
                    (category_filter, f"%{query_text}%", f"%{query_text}%", pool_size)
                )
            else:
                cur.execute(
                    "SELECT a.id, a.text, a.benefit, a.category, a.difficulty, a.times_picked, a.times_completed, a.total_rating_points, a.rating_count, v.url AS video_url, v.title AS video_title, v.youtube_id FROM actions a LEFT JOIN videos v ON v.id = a.video_id WHERE a.is_active = TRUE AND (a.text ILIKE %s OR a.benefit ILIKE %s) LIMIT %s",
                    (f"%{query_text}%", f"%{query_text}%", pool_size)
                )
            
            columns = [desc[0] for desc in cur.description]
            candidates = [dict(zip(columns, row)) for row in cur.fetchall()]
            
            if not candidates:
                return []
                
            ranked = rank_results(candidates)
            return format_results(ranked, limit)

        # Execute standard vector search
        candidates = fetch_candidates(cur, query_vector, pool_size, category_filter)
        if not candidates:
            return []
            
        ranked = rank_results(candidates)
        return format_results(ranked, limit)

    except Exception as e:
        # [Fix 6] Rollback cleanly on failure and explicitly log the error
        conn.rollback()
        print(f"❌ Database/Search Error: {e}")
        raise e 
    finally:
        cur.close()
        conn.close()