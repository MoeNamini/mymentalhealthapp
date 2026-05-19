# api.py
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
from fastapi.openapi.utils import get_openapi
from typing import Optional

load_dotenv()
security = HTTPBearer()

app = FastAPI(title="Mental Health Actions API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


class RatingRequest(BaseModel):
    rating: int


class MilestoneAckBody(BaseModel):
    action_id: int
    milestone: int


class JournalBody(BaseModel):
    action_id: Optional[int] = None
    content: str


class JournalUpdateBody(BaseModel):
    type: str
    content: str


class CustomActionBody(BaseModel):
    text: str
    benefit: str


class ReviewBody(BaseModel):
    content: str
    rating: Optional[int] = None


class FeedbackBody(BaseModel):
    content: str


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/search")
def search(
    q: str = Query("", description="The user's search query"),
    category: str = Query(None, description="Optional category filter"),
    limit: int = Query(12, ge=1, le=50),
):
    if not q.strip() and not category:
        return {"query": q, "count": 0, "results": []}

    if not q.strip() and category:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT a.id, a.text, a.benefit, a.category, a.difficulty, a.times_picked, a.times_completed, a.total_rating_points, a.rating_count, v.url, v.title, v.youtube_id
            FROM actions a LEFT JOIN videos v ON v.id = a.video_id
            WHERE a.category = %s AND a.is_active = TRUE ORDER BY a.times_picked DESC LIMIT %s;
        """,
            (category, limit),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        results = []
        for row in rows:
            avg_rating = round(row[7] / row[8], 2) if row[8] and row[8] > 0 else 0.0
            results.append(
                {
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
                    "embed_url": f"https://www.youtube.com/embed/{row[11]}"
                    if row[11]
                    else None,
                }
            )
        return {"query": q, "count": len(results), "results": results}

    try:
        results = search_actions(
            query_text=q.strip(), limit=limit, category_filter=category
        )
        return {"query": q, "count": len(results), "results": results}
    except Exception as e:
        return {
            "query": q,
            "count": 0,
            "results": [],
            "error": "Search engine is offline.",
        }


@app.get("/categories")
def get_categories():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT category, COUNT(*) as count FROM actions WHERE is_active = TRUE GROUP BY category ORDER BY count DESC;"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"categories": [{"name": r[0], "count": r[1]} for r in rows]}


@app.post("/actions/custom")
def create_custom_action(body: CustomActionBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO actions (text, benefit, category, difficulty, times_picked, is_active)
        VALUES (%s, %s, 'Customized', 3, 1, TRUE) RETURNING id;
    """,
        (body.text, body.benefit),
    )
    action_id = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO user_actions (user_id, action_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
        (int(user["sub"]), action_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"action_id": action_id}


@app.post("/actions/{action_id}/pick")
def pick_action(action_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE actions SET times_picked = times_picked + 1 WHERE id = %s AND is_active = TRUE RETURNING times_picked;",
        (action_id,),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404)
    return {"action_id": action_id, "times_picked": result[0]}


@app.post("/actions/{action_id}/complete")
async def user_complete_action(
    action_id: int, request: Request, user=Depends(get_current_user)
):
    body = await request.json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO completion_logs (user_id, action_id, source, difficulty, updates_global_counter) VALUES (%s, %s, %s, %s, %s) RETURNING id, completed_at;",
        (int(user["sub"]), action_id, "notification", body.get("difficulty"), False),
    )
    log_row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {"logged": True, "log_id": log_row[0], "timestamp": log_row[1].isoformat()}


@app.post("/actions/{action_id}/rate")
def rate_action(action_id: int, body: RatingRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE actions SET total_rating_points = total_rating_points + %s, rating_count = rating_count + 1 WHERE id = %s AND is_active = TRUE RETURNING total_rating_points, rating_count;",
        (body.rating, action_id),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not result:
        raise HTTPException(status_code=404)
    return {
        "action_id": action_id,
        "avg_rating": round(result[0] / result[1], 2),
        "rating_count": result[1],
    }


@app.get("/actions/{action_id}/reviews")
def get_reviews(action_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT u.name, r.rating, r.content FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.action_id = %s ORDER BY r.created_at DESC;",
            (action_id,),
        )
        rows = cur.fetchall()
        reviews = [{"user": r[0], "rating": r[1] or 5, "text": r[2]} for r in rows]
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        reviews = []
    cur.close()
    conn.close()
    return {"reviews": reviews}


@app.post("/actions/{action_id}/review")
def post_review(action_id: int, body: ReviewBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO reviews (action_id, user_id, content, rating) VALUES (%s, %s, %s, %s)",
            (action_id, int(user["sub"]), body.content, body.rating),
        )
        conn.commit()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
    cur.close()
    conn.close()
    return {"success": True}


@app.post("/profile/feedback")
def post_feedback(body: FeedbackBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO feedback (user_id, content) VALUES (%s, %s)",
            (int(user["sub"]), body.content),
        )
        conn.commit()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
    cur.close()
    conn.close()
    return {"success": True}


@app.get("/profile/actions")
def get_my_actions(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT a.id, a.text, a.benefit, a.category, a.difficulty, a.times_picked, a.times_completed, a.total_rating_points, a.rating_count, v.url, v.title, v.youtube_id, ua.picked_at, ua.is_active
        FROM user_actions ua JOIN actions a ON a.id = ua.action_id LEFT JOIN videos v ON v.id = a.video_id
        WHERE ua.user_id = %s ORDER BY ua.picked_at DESC;
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
        item["embed_url"] = (
            f"https://www.youtube.com/embed/{item['youtube_id']}"
            if item.get("youtube_id")
            else None
        )
        item["picked_at"] = item["picked_at"].isoformat()
        results.append(item)
    return {"actions": results, "count": len(results)}


@app.post("/profile/actions/{action_id}/finish")
def finish_action(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE user_actions SET is_active = FALSE WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), action_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"finished": True}


@app.post("/profile/actions/{action_id}/restart")
def restart_action(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE user_actions SET is_active = TRUE WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), action_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"restarted": True}


@app.post("/profile/actions/{action_id}/uncomplete")
def uncomplete_action(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, source FROM completion_logs WHERE user_id = %s AND action_id = %s AND DATE(completed_at) = CURRENT_DATE",
        (int(user["sub"]), action_id),
    )
    has_profile = any(l[1] == "profile" for l in cur.fetchall())
    if has_profile:
        cur.execute(
            "UPDATE actions SET times_completed = GREATEST(times_completed - 1, 0) WHERE id = %s",
            (action_id,),
        )
    cur.execute(
        "DELETE FROM completion_logs WHERE user_id = %s AND action_id = %s AND DATE(completed_at) = CURRENT_DATE",
        (int(user["sub"]), action_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"uncompleted": True}


@app.get("/profile/streak/{action_id}")
def get_streak(action_id: int, user=Depends(get_current_user)):
    from datetime import date, timedelta

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT completed_at, DATE(completed_at) as day, difficulty
        FROM completion_logs WHERE user_id = %s AND action_id = %s ORDER BY completed_at DESC;
    """,
        (int(user["sub"]), action_id),
    )

    completed_rows = cur.fetchall()
    completed_days = []
    latest_diff_per_day = {}
    history = []

    for r in completed_rows:
        if r[2]:
            history.append(
                {
                    "datetime": r[0].isoformat()
                    if hasattr(r[0], "isoformat")
                    else str(r[0]),
                    "difficulty": r[2],
                }
            )
        if r[1] not in completed_days:
            completed_days.append(r[1])
            latest_diff_per_day[r[1]] = r[2]

    history.reverse()

    try:
        cur.execute(
            "SELECT DATE(created_at) as day, response FROM missed_logs WHERE user_id = %s AND action_id = %s ORDER BY day DESC;",
            (int(user["sub"]), action_id),
        )
        missed_rows = cur.fetchall()
        missed_dict = {r[0]: r[1] for r in missed_rows if r[1].strip()}
        all_reasons = [r[1] for r in missed_rows if r[1].strip()]
    except psycopg2.errors.UndefinedColumn:
        conn.rollback()
        missed_dict = {}
        all_reasons = []

    cur.execute(
        "SELECT COUNT(*) FROM user_actions WHERE action_id = %s AND is_active = TRUE;",
        (action_id,),
    )
    global_active = cur.fetchone()[0]

    cur.close()
    conn.close()

    streak = 0
    today = date.today()
    for i, day in enumerate(completed_days):
        if day == today - timedelta(days=i):
            streak += 1
        else:
            break

    def day_map(n):
        result = []
        for i in range(n - 1, -1, -1):
            d = today - timedelta(days=i)
            result.append(
                {
                    "date": d.isoformat(),
                    "completed": d in completed_days,
                    "difficulty": latest_diff_per_day.get(d, None),
                    "missed_reason": missed_dict.get(d, None),
                }
            )
        return result

    return {
        "streak": streak,
        "days_7": day_map(7),
        "days_30": day_map(30),
        "days_90": day_map(90),
        "days_365": day_map(365),
        "all_missed_reasons": all_reasons,
        "difficulty_history": history,
        "global_active": global_active,
    }


@app.get("/profile/reminder/{action_id}")
def get_reminder(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT reminder_type, frequency_type, frequency_value, target_hour, target_minute, target_ampm FROM reminders WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), action_id),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"exists": False}
    return {
        "exists": True,
        "reminder_type": row[0],
        "frequency_type": row[1],
        "frequency_value": row[2],
        "target_hour": row[3],
        "target_minute": row[4],
        "target_ampm": row[5],
    }


@app.post("/profile/reminder")
async def save_reminder(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM reminders WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), body["action_id"]),
    )
    cur.execute(
        "INSERT INTO reminders (user_id, action_id, reminder_type, frequency_type, frequency_value, target_hour, target_minute, target_ampm) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;",
        (
            int(user["sub"]),
            body["action_id"],
            body["reminder_type"],
            body.get("frequency_type"),
            body.get("frequency_value"),
            body.get("target_hour", "08"),
            body.get("target_minute", "00"),
            body.get("target_ampm", "AM"),
        ),
    )
    reminder_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"reminder_id": reminder_id, "saved": True}


@app.delete("/profile/reminder/{action_id}")
def delete_reminder(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM reminders WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), action_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"deleted": True}


@app.get("/profile/reminders")
def get_all_reminders(user=Depends(get_current_user)):
    from datetime import date, timedelta

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT r.action_id, r.reminder_type, r.frequency_type, r.frequency_value, r.target_hour, r.target_minute, r.target_ampm, a.text FROM reminders r JOIN actions a ON a.id = r.action_id WHERE r.user_id = %s",
        (int(user["sub"]),),
    )
    rows = cur.fetchall()

    results = []
    for r in rows:
        act_id = r[0]
        cur.execute(
            "SELECT DATE(completed_at) FROM completion_logs WHERE user_id = %s AND action_id = %s ORDER BY DATE(completed_at) DESC",
            (int(user["sub"]), act_id),
        )
        c_days = sorted(set(row[0] for row in cur.fetchall()), reverse=True)
        streak = 0
        today = date.today()
        for i, day in enumerate(c_days):
            if day == today - timedelta(days=i):
                streak += 1
            else:
                break
        results.append(
            {
                "action_id": act_id,
                "reminder_type": r[1],
                "frequency_type": r[2],
                "frequency_value": r[3],
                "target_hour": r[4],
                "target_minute": r[5],
                "target_ampm": r[6],
                "text": r[7],
                "streak": streak,
            }
        )

    cur.close()
    conn.close()
    return {"reminders": results}


@app.post("/profile/missed")
async def log_missed(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO missed_logs (user_id, action_id, response) VALUES (%s, %s, %s) RETURNING id;",
        (int(user["sub"]), body["action_id"], body.get("response", "")),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"logged": True}


@app.post("/profile/journal")
async def save_journal(body: JournalBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO journal_logs (user_id, action_id, content) VALUES (%s, %s, %s) RETURNING id;",
        (int(user["sub"]), body.action_id, body.content),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"saved": True}


@app.put("/profile/journal/{log_id}")
def update_journal(
    log_id: int, body: JournalUpdateBody, user=Depends(get_current_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    if body.type == "journal":
        cur.execute(
            "UPDATE journal_logs SET content = %s WHERE id = %s AND user_id = %s",
            (body.content, log_id, int(user["sub"])),
        )
    elif body.type == "missed":
        cur.execute(
            "UPDATE missed_logs SET response = %s WHERE id = %s AND user_id = %s",
            (body.content, log_id, int(user["sub"])),
        )
    conn.commit()
    cur.close()
    conn.close()
    return {"updated": True}


@app.delete("/profile/journal/{log_id}")
def delete_journal(log_id: int, type: str, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    if type == "journal":
        cur.execute(
            "DELETE FROM journal_logs WHERE id = %s AND user_id = %s",
            (log_id, int(user["sub"])),
        )
    elif type == "missed":
        cur.execute(
            "DELETE FROM missed_logs WHERE id = %s AND user_id = %s",
            (log_id, int(user["sub"])),
        )
    conn.commit()
    cur.close()
    conn.close()
    return {"deleted": True}


@app.get("/profile/journal")
def get_journal(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 'journal' as type, j.id, j.action_id, a.text as action_text, j.content, j.created_at
        FROM journal_logs j LEFT JOIN actions a ON j.action_id = a.id WHERE j.user_id = %s
        UNION ALL
        SELECT 'missed' as type, m.id, m.action_id, a.text as action_text, m.response as content, m.created_at
        FROM missed_logs m JOIN actions a ON m.action_id = a.id WHERE m.user_id = %s AND m.response != ''
        ORDER BY created_at DESC;
    """,
        (int(user["sub"]), int(user["sub"])),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {
        "journal": [
            {
                "type": r[0],
                "id": r[1],
                "action_id": r[2],
                "action_text": r[3] or "General Thoughts",
                "content": r[4],
                "created_at": r[5].isoformat()
                if hasattr(r[5], "isoformat")
                else str(r[5]),
            }
            for r in rows
        ]
    }


@app.get("/profile/milestones/{action_id}")
def check_milestones(action_id: int, user=Depends(get_current_user)):
    from datetime import date, timedelta

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT DATE(completed_at) FROM completion_logs WHERE user_id = %s AND action_id = %s ORDER BY DATE(completed_at) DESC",
        (int(user["sub"]), action_id),
    )
    rows = cur.fetchall()
    completed_days = sorted(set(r[0] for r in rows), reverse=True)
    streak = 0
    today = date.today()
    for i, day in enumerate(completed_days):
        if day == today - timedelta(days=i):
            streak += 1
        else:
            break
    crossed = [m for m in [7, 30, 90, 180, 360] if streak >= m]
    cur.execute(
        "SELECT milestone FROM milestone_logs WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), action_id),
    )
    already_seen = {r[0] for r in cur.fetchall()}
    new_milestones = [m for m in crossed if m not in already_seen]
    cur.close()
    conn.close()
    return {
        "streak": streak,
        "new_milestones": new_milestones,
        "celebrate": max(new_milestones) if new_milestones else None,
    }


@app.post("/profile/milestones/acknowledge")
def acknowledge_milestone(body: MilestoneAckBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO milestone_logs (user_id, action_id, milestone) VALUES (%s, %s, %s) ON CONFLICT (user_id, action_id, milestone) DO NOTHING",
        (int(user["sub"]), body.action_id, body.milestone),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"acknowledged": True}


# Append these endpoints to the bottom of api.py


class UsernameBody(BaseModel):
    username: str


class PasswordBody(BaseModel):
    current_password: str
    new_password: str


class AboutBody(BaseModel):
    about_me: str


class DeleteAccountBody(BaseModel):
    reason: Optional[str] = ""


@app.put("/profile/username")
def update_username(body: UsernameBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET name = %s WHERE id = %s", (body.username, int(user["sub"]))
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}


@app.put("/profile/password")
def update_password(body: PasswordBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()

    # 🔐 First pull current password hash to check authenticity
    cur.execute("SELECT password_hash FROM users WHERE id = %s", (int(user["sub"]),))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    # NOTE: Replace with your encryption engine verify check if using passlib/bcrypt
    # e.g., if not pwd_context.verify(body.current_password, row[0]):
    if body.current_password != row[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Current password check failed.")

    cur.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (body.new_password, int(user["sub"])),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}


@app.put("/profile/about")
def update_about(body: AboutBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET about_me = %s WHERE id = %s",
        (body.about_me, int(user["sub"])),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}


@app.delete("/profile/account")
def purge_account(body: DeleteAccountBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()

    # Optional: Log the exit interview feedback before deleting data rows
    if body.reason:
        try:
            cur.execute(
                "INSERT INTO feedback (user_id, content) VALUES (%s, %s)",
                (int(user["sub"]), f"Exit Feedback: {body.reason}"),
            )
        except Exception:
            pass  # Fail gracefully if feedback framework table isn't present

    # Purge user rows - cascades automatically deletes their habits/logs
    cur.execute("DELETE FROM users WHERE id = %s", (int(user["sub"]),))
    conn.commit()
    cur.close()
    conn.close()
    return {"purged": True}
