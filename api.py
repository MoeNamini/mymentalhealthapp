# api.py
# The FastAPI backend server.
# Start it with: uv run uvicorn api:app --reload --port 8000
#
# Once running, open http://localhost:8000/docs in your browser
# to see all endpoints with a visual test interface.

import os
import psycopg2
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from search_engine import search_actions

from auth import router as auth_router, get_current_user

from fastapi import Depends, Request

from fastapi.security import HTTPBearer

load_dotenv()

from fastapi.openapi.utils import get_openapi

security = HTTPBearer()

app = FastAPI(
    title="Mental Health Actions API",
    description="MindActions backend API",
    version="1.0.0",
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {})["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

# --- Allow the React frontend to talk to this server ---
# Without this, the browser blocks requests between
# localhost:5173 (React) and localhost:8000 (FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add this line right after the app.add_middleware(...) block
app.include_router(auth_router)


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# ─────────────────────────────────────────────
# REQUEST BODY MODELS
# These define what shape of data the frontend
# must send in POST requests
# ─────────────────────────────────────────────


class RatingRequest(BaseModel):
    rating: int  # must be 1 to 5


class MilestoneAckBody(BaseModel):
    action_id: int
    milestone: int


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────


@app.get("/")
def root():
    """Health check — visit this to confirm the server is running."""
    return {"status": "ok", "message": "Mental Health Actions API is running"}


@app.get("/search")
def search(
    q: str = Query(..., description="The user's search query"),
    category: str = Query(None, description="Optional category filter"),
    limit: int = Query(10, ge=1, le=50, description="Number of results to return"),
):
    """
    Main search endpoint.
    Converts the query to a vector and returns ranked actions.

    Example: GET /search?q=I feel anxious&category=mindfulness&limit=5
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results = search_actions(
        query_text=q.strip(),
        limit=limit,
        category_filter=category,
    )
    return {"query": q, "count": len(results), "results": results}


@app.get("/categories")
def get_categories():
    """
    Returns all categories that have at least one active action.
    The frontend uses this to build the filter buttons.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT category, COUNT(*) as count
        FROM actions
        WHERE is_active = TRUE
        GROUP BY category
        ORDER BY count DESC;
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return {"categories": [{"name": row[0], "count": row[1]} for row in rows]}


@app.get("/actions/{action_id}")
def get_action(action_id: int):
    """
    Returns a single action by its ID with full details.
    Used when the user opens an action detail view.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            a.id, a.text, a.benefit, a.category, a.difficulty,
            a.times_picked, a.times_completed,
            a.total_rating_points, a.rating_count,
            v.url, v.title, v.youtube_id
        FROM actions a
        JOIN videos v ON v.id = a.video_id
        WHERE a.id = %s AND a.is_active = TRUE;
    """,
        (action_id,),
    )

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Action not found")

    avg_rating = round(row[7] / row[8], 2) if row[8] and row[8] > 0 else 0.0

    return {
        "id": row[0],
        "text": row[1],
        "benefit": row[2],
        "category": row[3],
        "difficulty": row[4],
        "times_picked": row[5],
        "times_completed": row[6],
        "avg_rating": avg_rating,
        "video_url": row[9],
        "video_title": row[10],
        "embed_url": f"https://www.youtube.com/embed/{row[11]}",
    }


@app.post("/actions/{action_id}/pick")
def pick_action(action_id: int):
    """
    Called when the user clicks 'I'll try this'.
    Increments the times_picked counter by 1.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE actions
        SET times_picked = times_picked + 1
        WHERE id = %s AND is_active = TRUE
        RETURNING times_picked;
    """,
        (action_id,),
    )

    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Action not found")

    return {"action_id": action_id, "times_picked": result[0]}


@app.post("/actions/{action_id}/complete")
def complete_action(action_id: int):
    """
    Called when the user clicks 'Done — I completed this'.
    Increments the times_completed counter by 1.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE actions
        SET times_completed = times_completed + 1
        WHERE id = %s AND is_active = TRUE
        RETURNING times_completed;
    """,
        (action_id,),
    )

    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Action not found")

    return {"action_id": action_id, "times_completed": result[0]}


@app.post("/actions/{action_id}/rate")
def rate_action(action_id: int, body: RatingRequest):
    """
    Called when the user submits a star rating (1-5).
    Adds to total_rating_points and increments rating_count.
    avg_rating is calculated at query time: total_points / count.
    """
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE actions
        SET
            total_rating_points = total_rating_points + %s,
            rating_count = rating_count + 1
        WHERE id = %s AND is_active = TRUE
        RETURNING total_rating_points, rating_count;
    """,
        (body.rating, action_id),
    )

    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Action not found")

    avg = round(result[0] / result[1], 2)
    return {"action_id": action_id, "avg_rating": avg, "rating_count": result[1]}


@app.get("/stats")
def get_stats():
    """
    Returns overall database stats.
    Used on a dashboard or home screen.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM actions WHERE is_active = TRUE")
    total_actions = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM videos")
    total_videos = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM transcripts")
    total_transcripts = cur.fetchone()[0]

    cur.execute("""
        SELECT text, times_picked FROM actions
        WHERE is_active = TRUE
        ORDER BY times_picked DESC LIMIT 3
    """)
    most_picked = [{"text": r[0], "times_picked": r[1]} for r in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        "total_actions": total_actions,
        "total_videos": total_videos,
        "total_transcripts": total_transcripts,
        "most_picked": most_picked,
    }


# auth extention


@app.get("/profile/actions")
def get_my_actions(user=Depends(get_current_user)):
    """Returns all actions the logged-in user has picked."""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            a.id, a.text, a.benefit, a.category, a.difficulty,
            a.times_picked, a.times_completed,
            a.total_rating_points, a.rating_count,
            v.url, v.title, v.youtube_id,
            ua.picked_at
        FROM user_actions ua
        JOIN actions a ON a.id = ua.action_id
        JOIN videos v ON v.id = a.video_id
        WHERE ua.user_id = %s AND ua.is_active = TRUE
        ORDER BY ua.picked_at DESC;
    """,
        (int(user["sub"]),),
    )

    columns = [d[0] for d in cur.description]
    rows = cur.fetchall()
    cur.close()
    conn.close()

    results = []
    for row in rows:
        item = dict(zip(columns, row))
        item["avg_rating"] = (
            round(item["total_rating_points"] / item["rating_count"], 2)
            if item["rating_count"]
            else 0.0
        )
        item["embed_url"] = f"https://www.youtube.com/embed/{item['youtube_id']}"
        item["picked_at"] = item["picked_at"].isoformat()
        results.append(item)

    return {"actions": results, "count": len(results)}


@app.post("/profile/actions/{action_id}/pick")
def user_pick_action(action_id: int, user=Depends(get_current_user)):
    """
    User picks an action — adds it to their personal list.
    Also increments the global times_picked counter on the actions table.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Add to user's personal list (ignore if already picked)
    cur.execute(
        """
        INSERT INTO user_actions (user_id, action_id)
        VALUES (%s, %s)
        ON CONFLICT (user_id, action_id) DO NOTHING;
    """,
        (int(user["sub"]), action_id),
    )

    # Increment global times_picked counter
    cur.execute(
        """
        UPDATE actions SET times_picked = times_picked + 1
        WHERE id = %s RETURNING times_picked;
    """,
        (action_id,),
    )

    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"action_id": action_id, "times_picked": result[0] if result else 0}


@app.post("/profile/actions/{action_id}/complete")
async def user_complete_action(
    action_id: int, request: Request, user=Depends(get_current_user)
):
    """
    Records a completion event.

    Body must include:
      source: "notification" | "profile"
      difficulty: "easy" | "medium" | "hard"  (only for notification source)

    Rules:
      - source = "notification" → saves to completion_logs only
      - source = "profile"      → saves to completion_logs AND increments
                                   actions.times_completed globally
    """
    body = await request.json()
    source = body.get("source", "profile")
    difficulty = body.get("difficulty")

    conn = get_db_connection()
    cur = conn.cursor()

    updates_global = source == "profile"

    # Save to completion_logs
    cur.execute(
        """
        INSERT INTO completion_logs
            (user_id, action_id, source, difficulty, updates_global_counter)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, completed_at;
    """,
        (int(user["sub"]), action_id, source, difficulty, updates_global),
    )
    log_row = cur.fetchone()

    # If profile completion → also update global counter
    if updates_global:
        cur.execute(
            """
            UPDATE actions SET times_completed = times_completed + 1
            WHERE id = %s RETURNING times_completed;
        """,
            (action_id,),
        )

    conn.commit()
    cur.close()
    conn.close()

    return {
        "logged": True,
        "source": source,
        "log_id": log_row[0],
        "timestamp": log_row[1].isoformat(),
    }


@app.get("/profile/streak/{action_id}")
def get_streak(action_id: int, user=Depends(get_current_user)):
    """
    Calculates the current consecutive-day streak for a user on a specific action.
    Also returns completion data for 7, 30, and 90-day circle visualisation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT DATE(completed_at) as day
        FROM completion_logs
        WHERE user_id = %s AND action_id = %s
        ORDER BY day DESC;
    """,
        (int(user["sub"]), action_id),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    from datetime import date, timedelta

    completed_days = sorted(set(r[0] for r in rows), reverse=True)

    # Calculate streak
    streak = 0
    today = date.today()
    for i, day in enumerate(completed_days):
        expected = today - timedelta(days=i)
        if day == expected:
            streak += 1
        else:
            break

    # Build day maps for 7 / 30 / 90 day views
    def day_map(n):
        result = []
        for i in range(n - 1, -1, -1):
            d = today - timedelta(days=i)
            result.append(
                {
                    "date": d.isoformat(),
                    "completed": d in completed_days,
                }
            )
        return result

    return {
        "streak": streak,
        "days_7": day_map(7),
        "days_30": day_map(30),
        "days_90": day_map(90),
    }


@app.post("/profile/reminder")
async def save_reminder(request: Request, user=Depends(get_current_user)):
    """Saves reminder settings for a user's action."""
    body = await request.json()

    conn = get_db_connection()
    cur = conn.cursor()

    # Remove any existing reminder for this user+action pair
    cur.execute(
        """
        DELETE FROM reminders WHERE user_id = %s AND action_id = %s
    """,
        (int(user["sub"]), body["action_id"]),
    )

    cur.execute(
        """
        INSERT INTO reminders
            (user_id, action_id, reminder_type, frequency_type, frequency_value)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id;
    """,
        (
            int(user["sub"]),
            body["action_id"],
            body["reminder_type"],  # time | button
            body.get("frequency_type"),  # minute | hour | day
            body.get("frequency_value"),  # the number
        ),
    )

    reminder_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {"reminder_id": reminder_id, "saved": True}


@app.post("/profile/missed")
async def log_missed(request: Request, user=Depends(get_current_user)):
    """Saves the user's response to the evening 'what stopped you?' check-in."""
    body = await request.json()

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO missed_logs (user_id, action_id, response)
        VALUES (%s, %s, %s) RETURNING id;
    """,
        (int(user["sub"]), body["action_id"], body.get("response", "")),
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"logged": True}


# ── Add these imports at the top of api.py if not already there ──
# from auth import get_current_user   (already there)

MILESTONES = [7, 30, 90]  # the milestone thresholds in days


@app.get("/profile/milestones/{action_id}")
def check_milestones(action_id: int, user=Depends(get_current_user)):
    """
    Checks if the user has crossed any NEW milestone (7, 30, 90 day streak)
    for a specific action that they have not been congratulated for yet.

    Returns a list of newly achieved milestones.
    If empty, no popup should be shown.
    """
    from datetime import date, timedelta

    conn = get_db_connection()
    cur = conn.cursor()

    # Get all days this user completed this action
    cur.execute(
        """
        SELECT DATE(completed_at)
        FROM completion_logs
        WHERE user_id = %s AND action_id = %s
        ORDER BY DATE(completed_at) DESC
    """,
        (int(user["sub"]), action_id),
    )

    rows = cur.fetchall()
    completed_days = sorted(set(r[0] for r in rows), reverse=True)

    # Calculate current streak (consecutive days ending today or yesterday)
    streak = 0
    today = date.today()
    for i, day in enumerate(completed_days):
        if day == today - timedelta(days=i):
            streak += 1
        else:
            break

    # Find which milestones this streak has crossed
    crossed = [m for m in MILESTONES if streak >= m]

    # Find which milestones were already acknowledged
    cur.execute(
        """
        SELECT milestone FROM milestone_logs
        WHERE user_id = %s AND action_id = %s
    """,
        (int(user["sub"]), action_id),
    )

    already_seen = {r[0] for r in cur.fetchall()}

    # Only return milestones that are newly crossed and not yet seen
    new_milestones = [m for m in crossed if m not in already_seen]

    cur.close()
    conn.close()

    return {
        "streak": streak,
        "new_milestones": new_milestones,
        # Return the highest new milestone so we show only one popup at a time
        "celebrate": max(new_milestones) if new_milestones else None,
    }


class MilestoneAckBody(BaseModel):
    action_id: int
    milestone: int


@app.post("/profile/milestones/acknowledge")
def acknowledge_milestone(body: MilestoneAckBody, user=Depends(get_current_user)):
    if body.milestone not in [7, 30, 90]:
        raise HTTPException(status_code=400, detail="Milestone must be 7, 30, or 90")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO milestone_logs (user_id, action_id, milestone)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, action_id, milestone) DO NOTHING
    """,
        (int(user["sub"]), body.action_id, body.milestone),
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"acknowledged": True, "milestone": body.milestone}
