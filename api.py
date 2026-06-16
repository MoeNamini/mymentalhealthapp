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

import google.generativeai as genai
import json
import datetime

from pathlib import Path

import base64
from google.genai import types, Client

import asyncio
from fastapi import BackgroundTasks
from fastapi.responses import Response

import wave
import io
from fastapi import Depends

import datetime
from datetime import timezone, timedelta

import urllib.parse

from cryptography.fernet import Fernet

import time

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)
security = HTTPBearer()

app = FastAPI(title="Mental Health Actions API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                 # Allows you to test safely on your computer
        "https://mymentalhealthapp.vercel.app"   # Your official live production app
    ],
    allow_credentials=True,                      # Highly recommended for secure login tokens
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)





# ─── 1. AUDIO GENERATION ENGINE ───
'''
def generate_audio_task(action_id: int):
    """Background task to generate TTS audio using Gemini 2.5 Flash."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if it already exists so we don't waste API calls
        cur.execute("SELECT text, benefit, audio_data FROM actions WHERE id = %s", (action_id,))
        action = cur.fetchone()
        
        if not action or action[2]: # If action not found or audio already exists
            return
            
        text, benefit = action[0], action[1]
        prompt = f"Please read the following task and its benefit in a smooth, warm, comforting voice.\nTask: {text}\nWhy it helps: {benefit or 'This is a great step for your routine.'}"

        # Initialize Gemini Client (uses GEMINI_API_KEY from .env automatically)
        client = Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash-tts',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                system_instruction="You are a warm, encouraging personal life coach."
            )
        )
        
        # Convert audio bytes to base64 text for safe database storage
        audio_bytes = response.candidates[0].content.parts[0].inline_data.data
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        cur.execute("UPDATE actions SET audio_data = %s WHERE id = %s", (audio_b64, action_id))
        conn.commit()
    except Exception as e:
        print(f"❌ Audio Generation Failed: {e}")
    finally:
        cur.close()
        conn.close()
'''

from google.genai import Client, types
from fastapi.responses import Response
import base64
from fastapi import BackgroundTasks

# ─── AUDIO GENERATION ENGINE ───
# ─── AUDIO GENERATION ENGINE ───
# ─── AUDIO GENERATION ENGINE ───
def add_wav_header(pcm_bytes: bytes) -> bytes:
    """Wraps raw PCM audio from Gemini into a playable WAV container."""
    with io.BytesIO() as wav_io:
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(1)       # Mono sound
            wav_file.setsampwidth(2)       # 16-bit
            wav_file.setframerate(24000)   # Gemini's standard 24kHz sample rate
            wav_file.writeframes(pcm_bytes)
        return wav_io.getvalue()

# ─── AUDIO GENERATION ENGINE ───
def generate_audio_task(action_id: int):
    """Background task to generate TTS audio using Gemini 2.5 Flash TTS."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT text, benefit, audio_data FROM actions WHERE id = %s", (action_id,))
        action = cur.fetchone()
        
        if not action or action[2]: 
            return # Audio already exists, no need to regenerate
            
        text, benefit = action[0], action[1]
        prompt = f"Say in a warm and encouraging tone: {text}. Why it helps: {benefit or 'This is a great step for your routine.'}"

        client = Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash-preview-tts',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Kore" 
                        )
                    )
                )
            )
        )
        
        # 1. Grab the Raw PCM bytes
        raw_pcm = response.candidates[0].content.parts[0].inline_data.data
        
        # 2. Convert to a playable WAV file
        wav_bytes = add_wav_header(raw_pcm)
        
        # 3. Save the WAV to the database
        audio_b64 = base64.b64encode(wav_bytes).decode('utf-8')
        cur.execute("UPDATE actions SET audio_data = %s WHERE id = %s", (audio_b64, action_id))
        conn.commit()
    except Exception as e:
        print(f"❌ Audio Generation Failed: {e}")
    finally:
        cur.close()
        conn.close()

@app.post("/actions/{action_id}/generate-audio")
async def trigger_audio_generation(action_id: int, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    """Endpoint for the frontend to quietly trigger the generation."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT tier FROM users WHERE id = %s", (int(user["sub"]),))
    user_tier = cur.fetchone()[0]
    cur.close()
    conn.close()

    if user_tier not in ["paid", "pro"]:
        return {"status": "rejected", "reason": "Requires paid or pro tier."}

    background_tasks.add_task(generate_audio_task, action_id)
    return {"status": "Audio generation started"}

# ─── AUDIO PLAYBACK ROUTE ───
@app.get("/audio/{action_id}")
async def stream_action_audio(action_id: int):
    """Streams the saved audio, or generates it on the fly if it's missing!"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT audio_data, text, benefit FROM actions WHERE id = %s", (action_id,))
    row = cur.fetchone()

    if not row:
        cur.close()
        conn.close()
        return Response(status_code=404)

    audio_data = row[0]

    if not audio_data:
        try:
            print(f"Audio missing for Action {action_id}. Generating with Gemini 2.5 Flash TTS on the fly...")
            text, benefit = row[1], row[2]
            prompt = f"Say in a warm and encouraging tone: {text}. Why it helps: {benefit or 'This is a great step for your routine.'}"

            client = Client()
            response = client.models.generate_content(
                model='gemini-2.5-flash-preview-tts',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name="Kore" 
                            )
                        )
                    )
                )
            )
            
            raw_pcm = response.candidates[0].content.parts[0].inline_data.data
            wav_bytes = add_wav_header(raw_pcm)
            audio_data = base64.b64encode(wav_bytes).decode('utf-8')
            
            cur.execute("UPDATE actions SET audio_data = %s WHERE id = %s", (audio_data, action_id))
            conn.commit()
            print("✅ On-the-fly audio generation successful!")
            
        except Exception as e:
            print(f"❌ Gemini Audio Generation Failed: {e}")
            cur.close()
            conn.close()
            return Response(status_code=500)

    cur.close()
    conn.close()

    if audio_data:
        audio_bytes = base64.b64decode(audio_data)
        
        # 🟢 MAGIC FIX: If the audio already saved in your DB is raw PCM from earlier, 
        # this will wrap it in a WAV header instantly before your browser gets it!
        if not audio_bytes.startswith(b'RIFF'):
            audio_bytes = add_wav_header(audio_bytes)
            
        return Response(content=audio_bytes, media_type="audio/wav")

    return Response(status_code=404)


def get_db_connection():
    # We grab the raw URL string we just fixed in the .env file
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=500, 
            detail="DATABASE_URL is missing from environment variables!"
        )
    
    # We pass that single string directly into psycopg2
    return psycopg2.connect(database_url)


class RatingRequest(BaseModel):
    rating: int


class MilestoneAckBody(BaseModel):
    action_id: int
    milestone: int


class JournalBody(BaseModel):
    action_id: Optional[int] = None
    content: str
    custom_title: Optional[str] = None


class JournalUpdateBody(BaseModel):
    type: str
    content: str



class ReviewBody(BaseModel):
    content: str
    rating: Optional[int] = None


class FeedbackBody(BaseModel):
    content: str

class DifficultyBody(BaseModel):
    difficulty: str

class CompleteBody(BaseModel):
    source: str = "manual"
    difficulty: Optional[str] = "medium"

class VoiceBody(BaseModel):
    audio_b64: str
    mime_type: str = "audio/webm"


class CustomThemeBody(BaseModel):
    theme_data: dict  # This will hold the hex codes the user or AI generates


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


@app.get("/search/ai")
def ai_enhanced_search(
    q: str = Query(..., description="The user's search query"),
    category: str = Query(None, description="Optional category filter"),
    user=Depends(get_current_user)
):
    if not q.strip():
        return {"query": q, "count": 0, "results": []}

    # 1. Ask Gemini 2.5 Flash Lite to extract the real intent and write 3 queries
    system_prompt = f"""
    The user is searching for mental health or habit-building actions regarding: "{q}"
    Understand their core emotional intent and the real underlying problem. 
    Generate EXACTLY 3 distinct, highly optimized search phrases (3-7 words each) to fetch the best coping mechanisms from a vector database.
    Return ONLY a raw JSON array of 3 strings. Do not include markdown formatting.
    Example: ["reduce anxiety and panic fast", "breathing exercises for stress relief", "cognitive reframing techniques"]
    """
    
    try:
        # 🟢 Using the ultra-fast, cheap model from your list
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(
            system_prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        prompts = json.loads(response.text)
        
        # Fallback just in case Gemini gets confused
        if not isinstance(prompts, list):
            prompts = [q]
            
    except Exception as e:
        print(f"❌ Gemini API Error in AI Search: {e}")
        return {"query": q, "count": 0, "results": [], "error": "AI query generation failed. Check backend terminal."}

    # 2. Execute vector search for ALL 3 prompts!
    all_results = {}
    for prompt in prompts[:3]:  # Strictly limit to the 3 generated prompts
        try:
            # We fetch 8 actions per prompt (Max 24 total actions)
            results = search_actions(query_text=prompt, limit=8, category_filter=category)
            for res in results:
                if res['id'] not in all_results:
                    all_results[res['id']] = res
                else:
                    # If multiple AI queries found the SAME action, boost its relevance score!
                    all_results[res['id']]['final_score'] += 0.05
        except Exception as e:
            print(f"❌ Search Engine error for prompt '{prompt}': {e}")
            continue
            
    # 3. Sort final aggregated results by their boosted semantic/popularity scores
    final_list = list(all_results.values())
    final_list.sort(key=lambda x: x['final_score'], reverse=True)
    
    return {
        "query": q, 
        "prompts_used": prompts,  # Sends the 3 AI prompts back to the frontend so you can see what it searched for!
        "count": len(final_list), 
        "results": final_list
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


# 🟢 1. UNIFIED SCHEMA: Accepts Video, Audio, AND Spotify all at once
class CustomActionBody(BaseModel):
    text: str
    benefit: str
    is_audio: Optional[bool] = False
    is_video: Optional[bool] = False
    spotify_uri: Optional[str] = None
    spotify_name: Optional[str] = None
    spotify_type: Optional[str] = None
    video_url: Optional[str] = None
    video_start_time: Optional[int] = 0

# 🟢 2. UPGRADED ENDPOINT
@app.post("/profile/actions/custom")
def create_custom_action(body: CustomActionBody, user=Depends(get_current_user)):
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT tier FROM users WHERE id = %s", (user_id,))
        tier = cur.fetchone()[0] or "free"
        
        # Premium Lock
        if body.video_url and tier not in ["paid", "pro"]:
            return {"success": False, "error": "Custom videos are a Premium feature."}
            
        # Insert action with video URL
        cur.execute("""
            INSERT INTO actions (user_id, text, benefit, is_custom, video_url, video_start_time, is_active) 
            VALUES (%s, %s, %s, TRUE, %s, %s, TRUE) RETURNING id
        """, (user_id, body.text, body.benefit, body.video_url, body.video_start_time))
        
        new_action_id = cur.fetchone()[0]
        
        # 🟢 CRITICAL: Link the new action to the user AND save their Spotify/Audio triggers!
        cur.execute("""
            INSERT INTO user_actions (user_id, action_id, is_active, is_audio, is_video, spotify_uri, spotify_name, spotify_type, video_start_time)
            VALUES (%s, %s, TRUE, %s, %s, %s, %s, %s, %s)
        """, (user_id, new_action_id, body.is_audio, body.is_video, body.spotify_uri, body.spotify_name, body.spotify_type, body.video_start_time))
        
        conn.commit()
        return {"success": True, "action_id": new_action_id}
    except Exception as e:
        print(f"Error creating custom action: {e}")
        return {"success": False}
    finally:
        cur.close()
        conn.close()

class UpgradeBody(BaseModel):
    tier: str

@app.post("/profile/upgrade")
def upgrade_tier(body: UpgradeBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # Update the user's tier in the database
    cur.execute("UPDATE users SET tier = %s WHERE id = %s", (body.tier, int(user["sub"])))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True, "tier": body.tier}


@app.post("/profile/actions/{action_id}/pick")
def pick_action(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # 1. Increment global times picked
    cur.execute("UPDATE actions SET times_picked = times_picked + 1 WHERE id = %s AND is_active = TRUE", (action_id,))
    # 2. Add the action to the user's active profile!
    cur.execute("INSERT INTO user_actions (user_id, action_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;", (int(user["sub"]), action_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"action_id": action_id, "picked": True}


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
    
    # --- LAZY CRON: AUTO-FINISH EXPIRED ACTIONS ---
    try:
        cur.execute("""
            WITH expired AS (
                SELECT ua.user_id, ua.action_id
                FROM user_actions ua
                JOIN reminders r ON ua.action_id = r.action_id AND ua.user_id = r.user_id
                WHERE r.end_in_days IS NOT NULL 
                AND CURRENT_DATE >= (DATE(ua.picked_at) + r.end_in_days * INTERVAL '1 day')
                AND ua.is_active = TRUE
                AND ua.user_id = %s
            )
            UPDATE user_actions SET is_active = FALSE 
            WHERE (user_id, action_id) IN (SELECT user_id, action_id FROM expired);
        """, (int(user["sub"]),))

        cur.execute("""
            DELETE FROM reminders 
            WHERE (user_id, action_id) IN (
                SELECT ua.user_id, ua.action_id FROM user_actions ua
                JOIN reminders r ON ua.action_id = r.action_id AND ua.user_id = r.user_id
                WHERE r.end_in_days IS NOT NULL 
                AND CURRENT_DATE >= (DATE(ua.picked_at) + r.end_in_days * INTERVAL '1 day')
                AND ua.is_active = FALSE AND ua.user_id = %s
            )
        """, (int(user["sub"]),))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Lazy cron skipped to prevent crash: {e}")

    # 🟢 THE SINGLE, CORRECT QUERY (No duplicates below this!)
    # 🟢 THE SINGLE, CORRECT QUERY
    cur.execute("""
        SELECT a.id, a.text, a.benefit, a.category, a.difficulty, a.times_picked, a.times_completed, a.total_rating_points, a.rating_count, v.url, v.title, v.youtube_id, ua.picked_at, ua.is_active,
               ua.is_audio, ua.is_video, ua.spotify_uri, ua.spotify_name, ua.spotify_type, 
               COALESCE(ua.video_start_time, a.video_start_time) as video_start_time, a.video_url
        FROM user_actions ua
        JOIN actions a ON a.id = ua.action_id 
        LEFT JOIN videos v ON v.id = a.video_id
        WHERE ua.user_id = %s ORDER BY ua.picked_at DESC;
    """, (int(user["sub"]),))
    
    columns = [d[0] for d in cur.description]
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    results = []
    for row in rows:
        item = dict(zip(columns, row))
        item["avg_rating"] = round(item["total_rating_points"] / item["rating_count"], 2) if item["rating_count"] else 0.0
        item["picked_at"] = item["picked_at"].isoformat()
        
        # 🟢 SAFELY PARSES CUSTOM YOUTUBE URLS OR DEFAULT DATABASE VIDEOS
        if item.get("video_url"):
            v_url = item["video_url"]
            if "watch?v=" in v_url:
                v_id = v_url.split("watch?v=")[-1].split("&")[0]
                item["embed_url"] = f"https://www.youtube.com/embed/{v_id}"
            elif "youtu.be/" in v_url:
                v_id = v_url.split("youtu.be/")[-1].split("?")[0]
                item["embed_url"] = f"https://www.youtube.com/embed/{v_id}"
            else:
                item["embed_url"] = v_url
            item["video_title"] = "Custom Action Video"
        else:
            item["embed_url"] = f"https://www.youtube.com/embed/{item['youtube_id']}" if item.get("youtube_id") else None
            
        results.append(item)
        
    return {"actions": results, "count": len(results)}

@app.post("/profile/actions/{action_id}/finish")
def finish_action(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # Mark the action as completed
    cur.execute("UPDATE user_actions SET is_active = FALSE WHERE user_id = %s AND action_id = %s", (int(user["sub"]), action_id))
    # DELETE the ghost reminder so it stops buzzing!
    cur.execute("DELETE FROM reminders WHERE user_id = %s AND action_id = %s", (int(user["sub"]), action_id))
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
    # 🟢 We join reminders with user_actions to grab the triggers
    # 🟢 Update the SELECT to grab ua.video_start_time at the end
    cur.execute("""
        SELECT r.reminder_type, r.target_hour, r.target_minute, r.target_ampm, 
               r.frequency_type, r.frequency_value, r.end_in_days, r.loc_condition, r.loc_lat, r.loc_lng,
               ua.is_audio, ua.is_video, ua.spotify_uri, ua.spotify_name, ua.spotify_type, ua.video_start_time
        FROM user_actions ua
        LEFT JOIN reminders r ON ua.action_id = r.action_id AND ua.user_id = r.user_id
        WHERE ua.user_id = %s AND ua.action_id = %s
    """, (int(user["sub"]), action_id))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"exists": False}
        
    return {
        "exists": True,
        "reminder_type": row[0],
        "target_hour": row[1],
        "target_minute": row[2],
        "target_ampm": row[3],
        "frequency_type": row[4],
        "frequency_value": row[5],
        "end_in_days": row[6],
        "loc_condition": row[7],
        "loc_lat": row[8],
        "loc_lng": row[9],
        # 🟢 Send the trigger data to the frontend
        "is_audio": row[10] or False,
        "is_video": row[11] or False,
        "spotify_uri": row[12],
        "spotify_name": row[13],
        "spotify_type": row[14],
        "video_start_time": row[15] or 0
    }

@app.post("/profile/reminder")
async def save_reminder(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    # Save the triggers to the user_actions table
    cur.execute("""
        UPDATE user_actions 
        SET is_audio = %s, is_video = %s, spotify_uri = %s, spotify_name = %s, spotify_type = %s, video_start_time = %s, is_gcal = %s
        WHERE user_id = %s AND action_id = %s
    """, (
        body.get("is_audio", False), 
        body.get("is_video", False), 
        body.get("spotify_uri"), 
        body.get("spotify_name"), 
        body.get("spotify_type"), 
        body.get("video_start_time", 0), 
        body.get("is_gcal", False), 
        int(user["sub"]), 
        body.get("action_id")
    ))
    conn.commit()

    cur.execute(
        "DELETE FROM reminders WHERE user_id = %s AND action_id = %s",
        (int(user["sub"]), body["action_id"]),
    )
    
    cur.execute(
        """INSERT INTO reminders 
                                  (user_id, action_id, reminder_type, frequency_type, frequency_value, 
                                  target_hour, target_minute, target_ampm, end_in_days, 
                                  loc_condition, loc_lat, loc_lng) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
        (
            int(user["sub"]),
            body["action_id"],
            body["reminder_type"],
            body.get("frequency_type"),
            body.get("frequency_value"),
            body.get("target_hour", "08"),
            body.get("target_minute", "00"),
            body.get("target_ampm", "AM"),
            body.get("end_in_days"),
            body.get("loc_condition"), 
            body.get("loc_lat"),       
            body.get("loc_lng")        
        ),
    )
    reminder_id = cur.fetchone()[0]
    conn.commit()

    # 🟢 Push to Google Calendar if requested and if it's a Time reminder
    if body.get("is_gcal") and body.get("reminder_type") == "time":
        gcal_token = await get_valid_gcal_token(user_id, cur, conn)
        if gcal_token:
            # Construct tomorrow's date at the target hour
            h = int(body.get("target_hour", "08"))
            if body.get("target_ampm") == "PM" and h != 12: h += 12
            if body.get("target_ampm") == "AM" and h == 12: h = 0
            
            tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
            start_time = tomorrow.replace(hour=h, minute=int(body.get("target_minute", "00")), second=0)
            end_time = start_time + datetime.timedelta(minutes=15) # 15 min block
            
            event_data = {
                "summary": f"MindAction: {body.get('text', 'Reminder')}",
                "description": "Time for your mental wellness action!",
                "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"}
            }
            
            cal_url = "https://www." + "googleapis.com/calendar/v3/calendars/primary/events"
            async with httpx.AsyncClient() as client:
                await client.post(cal_url, headers={"Authorization": f"Bearer {gcal_token}"}, json=event_data)

    # 🟢 FIXED: Close connections and return AFTER the Calendar code runs
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
    
    cur.execute("""
        SELECT r.action_id, r.reminder_type, r.frequency_type, r.frequency_value, 
               r.target_hour, r.target_minute, r.target_ampm, a.text,
               r.loc_condition, r.loc_lat, r.loc_lng
        FROM reminders r 
        JOIN actions a ON a.id = r.action_id 
        JOIN user_actions ua ON ua.action_id = r.action_id AND ua.user_id = r.user_id
        WHERE r.user_id = %s AND ua.is_active = TRUE
    """, (int(user["sub"]),))
    rows = cur.fetchall()
    
    results = []
    for r in rows:
        act_id = r[0]
        cur.execute("SELECT DATE(completed_at) FROM completion_logs WHERE user_id = %s AND action_id = %s ORDER BY DATE(completed_at) DESC", (int(user["sub"]), act_id))
        c_days = sorted(set(row[0] for row in cur.fetchall()), reverse=True)
        streak = 0
        today = date.today()
        for i, day in enumerate(c_days):
            if day == today - timedelta(days=i): streak += 1
            else: break
            
        results.append({
            "action_id": act_id, "reminder_type": r[1], "frequency_type": r[2], 
            "frequency_value": r[3], "target_hour": r[4], "target_minute": r[5], 
            "target_ampm": r[6], "text": r[7], "streak": streak,
            "loc_condition": r[8], "loc_lat": r[9], "loc_lng": r[10] # 🟢 Included in the output
        })
        
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
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 🟢 NEW SMART LINKER: Check if the custom_title matches an existing Action
    final_action_id = body.action_id
    final_custom_title = body.custom_title

    if not final_action_id and final_custom_title:
        # Check if this text exactly matches one of their Actions
        cur.execute("SELECT id FROM actions WHERE user_id = %s AND text = %s LIMIT 1", (user_id, final_custom_title))
        row = cur.fetchone()
        
        if row:
            final_action_id = row[0]   # Found it! Officially link the ID.
            final_custom_title = None  # Clear the custom text since it's officially linked now.
    
    # Save the entry to the database using the smart-linked variables
    cur.execute("""
        INSERT INTO journal_logs (user_id, action_id, content, custom_title) 
        VALUES (%s, %s, %s, %s) RETURNING id;
    """, (user_id, final_action_id, body.content, final_custom_title))
    
    conn.commit()
    cur.close()
    conn.close()

    # 1. Detect if the session was "Intense" using body.content
    intense_keywords = ["overwhelmed", "stressed", "panic", "anxious", "terrible", "hard day", "burnout"]
    is_intense = any(word in body.content.lower() for word in intense_keywords)

    triggered_spotify = False
    if is_intense:
        # 2. Fire the background audio trigger
        triggered_spotify = await trigger_lofi_decompression(user_id)

    return {"saved": True, "vibe_shift": triggered_spotify}
import urllib.parse
import httpx

import base64

@app.get("/profile/cbt-distortions")
def get_cbt_distortions(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    try:
        # 🟢 Aggregates the distortions strings saved across all historical post-save logs
        cur.execute("""
            SELECT elem, COUNT(*)::int
            FROM journal_logs,
            LATERAL jsonb_array_elements_text(ai_analysis->'distortions') AS elem
            WHERE user_id = %s AND ai_analysis IS NOT NULL
            GROUP BY elem
            ORDER BY COUNT(*) DESC;
        """, (user_id,))
        
        rows = cur.fetchall()
        data = [{"distortion": r[0], "count": r[1]} for r in rows]
        return {"success": True, "distortions": data}
        
    except Exception as e:
        print(f"Error compiling cognitive traps: {e}")
        return {"success": False, "distortions": []}
    finally:
        cur.close()
        conn.close()

@app.get("/spotify/search")
async def search_spotify_catalog(q: str, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # 1. Grab BOTH the access token and the refresh token
    cur.execute("SELECT spotify_access_token, spotify_refresh_token FROM users WHERE id = %s", (int(user["sub"]),))
    row = cur.fetchone()
    
    if not row or not row[0]:
        cur.close()
        conn.close()
        return {"tracks": []}

    access_token = row[0]
    refresh_token = row[1]
    
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    # 2. Automatically refresh the token so the search NEVER dies
    if refresh_token and client_id and client_secret:
        auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        async with httpx.AsyncClient() as client:
            refresh_res = await client.post(
                "https://accounts.spotify.com/api/token",
                data={"grant_type": "refresh_token", "refresh_token": refresh_token},
                headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}
            )
            if refresh_res.status_code == 200:
                access_token = refresh_res.json().get("access_token")
                # Save the new token so it's good for another hour
                cur.execute("UPDATE users SET spotify_access_token = %s WHERE id = %s", (access_token, int(user["sub"])))
                conn.commit()

    cur.close()
    conn.close()

    # 3. Now make the real search with a guaranteed fresh token
    async with httpx.AsyncClient() as client:
        spotify_url = f"https://api.spotify.com/v1/search?q={urllib.parse.quote(q)}&type=track,playlist&limit=5"
        res = await client.get(
            spotify_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if res.status_code != 200:
            print(f"Spotify Search Failed: {res.text}") # Added a print so you can see if it ever fails again!
            return {"tracks": []}

        data = res.json()
        results = []
        
        for item in data.get("tracks", {}).get("items", []):
            results.append({
                "uri": item["uri"],
                "name": item["name"],
                "artist": item["artists"][0]["name"] if item.get("artists") else "Unknown",
                "type": "Track"
            })
            
        for item in data.get("playlists", {}).get("items", []):
            if item:
                results.append({
                    "uri": item["uri"],
                    "name": item["name"],
                    "artist": item.get("owner", {}).get("display_name", "Spotify"),
                    "type": "Playlist"
                })
                
        return {"tracks": results}

##
@app.post("/profile/voice-journal")
def process_voice_journal(body: VoiceBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Gate the feature for Premium users
    cur.execute("SELECT tier FROM users WHERE id = %s", (int(user["sub"]),))
    row = cur.fetchone()
    cur.close()
    conn.close()

    tier = row[0] if row else "free"
    if tier not in ["paid", "pro"]:
        return {"success": False, "error": "Voice journaling is a premium feature. Please upgrade to use this!"}

    try:
        # 2. Decode the audio from the browser
        audio_bytes = base64.b64decode(body.audio_b64)

        # 3. Prompt the AI
        system_prompt = """
        You are an empathetic journaling AI. The user has provided an audio recording of their thoughts.
        Task 1: Provide an exact, highly accurate text transcription of the audio.
        Task 2: Provide an empathetic, validating response (1 to 2 sentences max) acknowledging their feelings, ending with a relevant question to encourage deeper reflection.
        
        Respond ONLY with a raw JSON object containing these two exact keys:
        {
            "transcription": "The transcribed text...",
            "ai_reply": "Your empathetic response and question..."
        }
        """

        # 4. Use Gemini 2.5 Flash Lite's native audio capabilities
        from search_engine import client # Import your initialized client!
       # ... your existing system_prompt and client.models.generate_content lines ...
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=body.mime_type),
                system_prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # 🟢 THE FIX: Clean out potential markdown code fences before parsing the JSON string!
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        data = json.loads(raw_text)
        return {
            "success": True, 
            "transcription": data.get("transcription", ""), 
            "ai_reply": data.get("ai_reply", "")
        }
        
    except Exception as e:
        print(f"❌ Voice AI Error: {e}")
        return {"success": False, "error": f"Failed to process audio processing: {str(e)}"}
        
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
    
    # 🟢 FIXED: One clean query merging both tables and pulling ai_analysis safely!
    cur.execute("""
        SELECT 'journal' as type, j.id, j.action_id, COALESCE(a.text, j.custom_title, 'General Thoughts') as action_text, j.content, j.created_at, j.ai_analysis
        FROM journal_logs j LEFT JOIN actions a ON j.action_id = a.id WHERE j.user_id = %s
        UNION ALL
        SELECT 'missed' as type, m.id, m.action_id, a.text as action_text, m.response as content, m.created_at, NULL as ai_analysis
        FROM missed_logs m JOIN actions a ON m.action_id = a.id WHERE m.user_id = %s AND m.response != ''
        ORDER BY created_at DESC;
    """, (int(user["sub"]), int(user["sub"])))
    
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    # 🟢 FIXED: Added "ai_analysis": r[6] to send it to the frontend!
    return {
        "journal": [{
            "type": r[0], 
            "id": r[1], 
            "action_id": r[2], 
            "action_text": r[3], 
            "content": r[4], 
            "created_at": r[5].isoformat() if hasattr(r[5], 'isoformat') else str(r[5]),
            "ai_analysis": r[6] # 🟢 The AI data is now attached!
        } for r in rows]
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


@app.post("/profile/actions/{action_id}/complete")
def complete_action(action_id: int, body: CompleteBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # Safely logs the completion with the default medium difficulty so the circle lights up!
    cur.execute("""
        INSERT INTO completion_logs (user_id, action_id, source, difficulty) 
        VALUES (%s, %s, %s, %s) RETURNING id
    """, (int(user["sub"]), action_id, body.source, body.difficulty))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}

@app.get("/profile/actions/{action_id}/report")
def get_action_report(action_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Grab Difficulty History for the Chart
    cur.execute("""
        SELECT completed_at, difficulty FROM completion_logs 
        WHERE user_id = %s AND action_id = %s AND difficulty IS NOT NULL
        ORDER BY completed_at ASC
    """, (int(user["sub"]), action_id))
    history = [{"date": r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0]), "difficulty": r[1]} for r in cur.fetchall()]
    
    # 2. Grab Missed/Friction Reasons
    cur.execute("""
        SELECT created_at, response FROM missed_logs 
        WHERE user_id = %s AND action_id = %s AND response != ''
        ORDER BY created_at DESC
    """, (int(user["sub"]), action_id))
    reasons = [{"date": r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0]), "reason": r[1]} for r in cur.fetchall()]
    
    # 3. Grab Journal Entries
    cur.execute("""
        SELECT created_at, content FROM journal_logs 
        WHERE user_id = %s AND action_id = %s
        ORDER BY created_at DESC
    """, (int(user["sub"]), action_id))
    journals = [{"date": r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0]), "content": r[1]} for r in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    return {"history": history, "reasons": reasons, "journals": journals}



async def trigger_lofi_decompression(user_id: int):
    """Refreshes the Spotify token and forces Lofi playback on the user's active device."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT spotify_access_token, spotify_refresh_token, tier FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()

    # If they are free tier or haven't linked Spotify, abort silently
    if not row or row[2] == "free" or not row[1]:
        cur.close()
        conn.close()
        return False

    refresh_token = row[1]
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        # 1. Get a fresh, unexpired access token
        refresh_res = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if refresh_res.status_code == 200:
            access_token = refresh_res.json().get("access_token")
            # Save the fresh token
            cur.execute("UPDATE users SET spotify_access_token = %s WHERE id = %s", (access_token, user_id))
            conn.commit()
        else:
            access_token = row[0] # Try the old one as a fallback

        # 2. The Magic Play Command! 
        # This is the official Spotify URI for their "lofi beats" playlist
        lofi_uri = "spotify:playlist:37i9dQZF1DWWQRwui0S6Ni" 
        
        play_res = await client.put(
            "https://api.spotify.com/v1/me/player/play",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"context_uri": lofi_uri}
        )

    cur.close()
    conn.close()
    
    # Spotify returns 204 (No Content) if successful
    return play_res.status_code in [200, 204]




    # --- PHASE 2 MODELS ---
class ClosingTimeBody(BaseModel):
    closing_time: str

class MoodBody(BaseModel):
    mood_state: str

# --- PHASE 2 ENDPOINTS ---
@app.put("/profile/closing_time")
def update_closing_time(body: ClosingTimeBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET closing_time = %s WHERE id = %s", (body.closing_time, int(user["sub"])))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True, "closing_time": body.closing_time}

@app.get("/profile/settings")
def get_user_settings(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT closing_time FROM users WHERE id = %s", (int(user["sub"]),))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return {"closing_time": row[0] if row and row[0] else "20:00"}

@app.post("/profile/mood")
def log_mood(body: MoodBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO mood_logs (user_id, mood_state) VALUES (%s, %s) RETURNING id;",
        (int(user["sub"]), body.mood_state)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"logged": True}

@app.get("/profile/mood")
def get_moods(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    # Fetch mood history for the charting engine
    cur.execute("""
        SELECT mood_state, created_at FROM mood_logs 
        WHERE user_id = %s ORDER BY created_at ASC
    """, (int(user["sub"]),))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"moods": [{"mood": r[0], "date": r[1].isoformat()} for r in rows]}



genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# 🟢 1. NEW NESTED SCHEMA: Forces AI to return clean category percentages
class FrictionCategory(BaseModel):
    category: str
    percentage: int

class AICoachSchema(BaseModel):
    acknowledgment: str
    action_insights: str
    structural_suggestions: str
    encouragement: str
    friction_categories: list[FrictionCategory] # 🟢 The new Donut Chart data!

@app.get("/profile/ai-coach")
async def get_ai_coach_insights(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])

    try:
        cur.execute("SELECT name, about_me, closing_time, tier, ai_count, last_ai_date FROM users WHERE id = %s", (user_id,))
        u_row = cur.fetchone()
        
        if not u_row:
            return {"success": False, "error": "User not found."}

        user_data = {"name": u_row[0], "about_me": u_row[1], "closing_time": u_row[2]}
        tier = u_row[3] or "free"
        ai_count = u_row[4] or 0
        last_ai_date = u_row[5]

        today = datetime.date.today()
        if last_ai_date != today:
            ai_count = 0  

        if tier in ["free", "paid"] and ai_count >= 3:
            return {"success": False, "error": "You have reached your limit of 3 AI reports today. Try again tomorrow or upgrade!"}

        model_id = 'gemini-3.5-flash'

        gcal_token = await get_valid_gcal_token(user_id, cur, conn)
        todays_events = []
        if gcal_token:
            now = datetime.datetime.utcnow()
            start_of_day = now.replace(hour=0, minute=0, second=0).isoformat() + "Z"
            end_of_day = now.replace(hour=23, minute=59, second=59).isoformat() + "Z"
            
            cal_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={start_of_day}&timeMax={end_of_day}&singleEvents=true&orderBy=startTime"
            
            async with httpx.AsyncClient() as client:
                res = await client.get(cal_url, headers={"Authorization": f"Bearer {gcal_token}"})
                if res.status_code == 200:
                    for e in res.json().get("items", []):
                        todays_events.append({
                            "title": e.get("summary", "Busy"),
                            "start": e.get("start", {}).get("dateTime", e.get("start", {}).get("date")),
                            "end": e.get("end", {}).get("dateTime", e.get("end", {}).get("date"))
                        })

        try:
            cur.execute("""
                SELECT a.text, a.benefit, ua.times_completed 
                FROM user_actions ua 
                JOIN actions a ON ua.action_id = a.id 
                WHERE ua.user_id = %s AND ua.is_active = TRUE
            """, (user_id,))
            actions = [{"action": r[0], "why": r[1], "completions": r[2]} for r in cur.fetchall()]
        except Exception:
            conn.rollback()
            actions = ["(Action data temporarily unavailable due to schema mismatch)"]

        cur.execute("SELECT mood_state, created_at FROM mood_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT 365", (user_id,))
        moods = [{"mood": r[0], "date": r[1].isoformat()} for r in cur.fetchall()]

        cur.execute("""
            SELECT 'journal' as type, COALESCE(a.text, j.custom_title, 'General Thoughts') as action_text, j.content, j.created_at
            FROM journal_logs j LEFT JOIN actions a ON j.action_id = a.id WHERE j.user_id = %s
            UNION ALL
            SELECT 'missed' as type, a.text as action_text, m.response as content, m.created_at
            FROM missed_logs m JOIN actions a ON m.action_id = a.id WHERE m.user_id = %s AND m.response != ''
            ORDER BY created_at DESC LIMIT 200;
        """, (user_id, user_id))
        journals = [{"type": r[0], "action": r[1], "content": r[2], "date": r[3].isoformat() if hasattr(r[3], 'isoformat') else str(r[3])} for r in cur.fetchall()]

        full_context = {
            "user_profile": user_data,
            "active_actions": actions,
            "all_moods": moods,
            "all_journals_and_misses": journals,
            "todays_calendar_events": todays_events
        }

        # 🟢 2. UPDATED PROMPT: Explicitly tell the AI how to categorize the friction logs
        system_prompt = f"""
        You are an empathetic, highly analytical behavioral wellness coach.
        Here is the complete data dump of the user's entire history:
        {json.dumps(full_context)}
        
        Analyze all the 'missed' friction logs in the dataset. Group their abstract reasons for missing habits into distinct root-cause categories (e.g., "Work Fatigue", "Anxiety", "Time Mismanagement"). 
        Ensure the percentages inside `friction_categories` add up to 100.
        """

        model = genai.GenerativeModel(model_id)
        response = model.generate_content(
            system_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=AICoachSchema, 
                temperature=0.4
            )
        )
        ai_response = json.loads(response.text)
        
        # Save to DB
        cur.execute("INSERT INTO ai_reports (user_id, report_data) VALUES (%s, %s)", (user_id, json.dumps(ai_response)))
        cur.execute("UPDATE users SET ai_count = %s, last_ai_date = %s WHERE id = %s", (ai_count + 1, today, user_id))
        conn.commit()

        return {"success": True, "data": ai_response}
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"success": False, "error": "AI service is currently unavailable."}
    
    finally:
        cur.close()
        conn.close()


@app.get("/profile/me")
def get_user_profile_data(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # 🟢 ADDED: custom_theme to the database query
        cur.execute(
            "SELECT name, email, tier, about_me, gcal_access_token, spotify_access_token, custom_theme FROM users WHERE id = %s;", 
            (int(user["sub"]),)
        )
        row = cur.fetchone()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database Crash: {e}")

    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="User account not found.")

    return {
        "username": row[0],
        "email": row[1],
        "tier": row[2] or "free",
        "about_me": row[3] or "",
        "gcal_linked": bool(row[4]),
        "spotify_linked": bool(row[5]),
        "custom_theme": row[6] if row[6] else None # 🟢 Hands the saved theme back to React!
    }

@app.post("/spotify/play-reminder")
async def play_reminder_spotify(body: dict, user=Depends(get_current_user)):
    uri = body.get("uri")
    if not uri:
        return {"success": False, "error": "No URI provided"}
        
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT spotify_access_token, spotify_refresh_token, tier FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    
    if not row or row[2] == "free" or not row[1]:
        cur.close()
        conn.close()
        return {"success": False, "error": "User not eligible or token missing"}
        
    refresh_token = row[1]
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        # 1. Get a fresh token
        refresh_res = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            headers={"Authorization": f"Basic {auth_str}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        if refresh_res.status_code == 200:
            access_token = refresh_res.json().get("access_token")
            cur.execute("UPDATE users SET spotify_access_token = %s WHERE id = %s", (access_token, user_id))
            conn.commit()
        else:
            access_token = row[0]
            
        cur.close()
        conn.close()

        # 2. Play the specific URI!
        # Spotify requires different payload shapes for tracks vs playlists
        payload = {"uris": [uri]} if "track" in uri else {"context_uri": uri}
            
        play_res = await client.put(
            "https://api.spotify.com/v1/me/player/play",
            headers={"Authorization": f"Bearer {access_token}"},
            json=payload
        )
        
        return {"success": play_res.status_code in [200, 204]}

# ─── GOOGLE CALENDAR INTEGRATION ───



@app.get("/gcal/link")
def link_google_calendar(user=Depends(get_current_user)):
    """Generates the OAuth URL for Google Calendar."""
    client_id = os.getenv("GCAL_CLIENT_ID")
    redirect_uri = os.getenv("GCAL_REDIRECT_URI") 
    
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI in your .env file!")
        
    auth_base = "https://accounts." + "google.com/o/oauth2/v2/auth"
    scopes = "https://www." + "googleapis.com/auth/calendar.events"
    
    # 🟢 BULLETPROOF FIX: Safely encodes all parameters so Google never rejects it
    params = {
        "client_id": client_id.strip(),
        "redirect_uri": redirect_uri.strip(),
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": str(user['sub'])
    }
    
    auth_url = f"{auth_base}?{urllib.parse.urlencode(params)}"
    return {"url": auth_url}

@app.get("/gcal/callback")
async def google_calendar_callback(code: str, state: str):
    """Exchanges the code for tokens and saves them to the user."""
    client_id = os.getenv("GCAL_CLIENT_ID")
    client_secret = os.getenv("GCAL_CLIENT_SECRET")
    redirect_uri = os.getenv("GCAL_REDIRECT_URI")
    
    token_url = "https://oauth2." + "googleapis.com/token"
    
    async with httpx.AsyncClient() as client:
        res = await client.post(token_url, data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        })
        
        data = res.json()
        if "access_token" in data:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                UPDATE users SET gcal_access_token = %s, gcal_refresh_token = %s WHERE id = %s
            """, (data["access_token"], data.get("refresh_token"), int(state)))
            conn.commit()
            cur.close()
            conn.close()
            
    # Redirect back to the frontend profile page
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="https://mymentalhealthapp.vercel.app/?page=edit-profile")

async def get_valid_gcal_token(user_id: int, cur, conn):
    """Helper to get a fresh Google Calendar token."""
    cur.execute("SELECT gcal_access_token, gcal_refresh_token FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row or not row[0]: return None
    
    # In a production app, you'd check expiration time here. 
    # For simplicity, we'll force refresh if a refresh_token exists.
    if row[1]:
        token_url = "https://oauth2." + "googleapis.com/token"
        async with httpx.AsyncClient() as client:
            res = await client.post(token_url, data={
                "client_id": os.getenv("GCAL_CLIENT_ID"),
                "client_secret": os.getenv("GCAL_CLIENT_SECRET"),
                "refresh_token": row[1],
                "grant_type": "refresh_token"
            })
            if res.status_code == 200:
                new_token = res.json().get("access_token")
                cur.execute("UPDATE users SET gcal_access_token = %s WHERE id = %s", (new_token, user_id))
                conn.commit()
                return new_token
    return row[0]

    # ─── DISCONNECT INTEGRATIONS ───

@app.post("/gcal/disconnect")
def disconnect_gcal(user=Depends(get_current_user)):
    """Removes Google Calendar tokens and disables the sync flag on actions."""
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    # 1. Erase the tokens from the user
    cur.execute("UPDATE users SET gcal_access_token = NULL, gcal_refresh_token = NULL WHERE id = %s", (user_id,))
    # 2. Turn off the sync flag for all their actions so the app stops trying to push to Google
    cur.execute("UPDATE user_actions SET is_gcal = FALSE WHERE user_id = %s", (user_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}

@app.post("/spotify/disconnect")
def disconnect_spotify(user=Depends(get_current_user)):
    """Removes Spotify tokens from the user account."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("UPDATE users SET spotify_access_token = NULL, spotify_refresh_token = NULL WHERE id = %s", (int(user["sub"]),))
    
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}

@app.post("/profile/theme/custom")
def save_custom_theme(body: CustomThemeBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    # 1. Fetch current limits and tier
    cur.execute("SELECT tier, theme_changes_count, theme_reset_date FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    tier = row[0] or "free"
    count = row[1] or 0
    reset_date = row[2]
    
    today = datetime.date.today()
    
    # 2. Monthly Reset Logic (Reset count to 0 if 30 days have passed)
    if not reset_date or (today - reset_date).days >= 30:
        count = 0
        reset_date = today
        
    # 3. Enforce the Tier Limits!
    if tier == "pro" and count >= 10:
        cur.close()
        conn.close()
        return {"success": False, "error": "Pro limit reached (10/month). Resets next month."}
    elif tier == "paid" and count >= 4:
        cur.close()
        conn.close()
        return {"success": False, "error": "Paid limit reached (4/month). Resets next month."}
    
    # (Free users bypass the hard limit here because the frontend forces them to watch an Ad every single time they click it)
    
    # 4. Save the new theme and increment their count
    new_count = count + 1
    
    cur.execute("""
        UPDATE users 
        SET custom_theme = %s, theme_changes_count = %s, theme_reset_date = %s 
        WHERE id = %s
    """, (json.dumps(body.theme_data), new_count, reset_date, user_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"success": True, "message": "Theme saved!", "used": new_count}


class ImageThemeBody(BaseModel):
    image_b64: str
    mime_type: str = "image/jpeg"

class ThemeSchema(BaseModel):
    bg: str
    shadowDark: str
    shadowLight: str
    text: str
    subtext: str
    accent: str
    accentText: str
    tag: str
    streakOn: str
    streakOff: str
    placeholder: str
    bgRGB: str
    selectionBg: str

@app.post("/profile/theme/generate-from-image")
def generate_theme_from_image(body: ImageThemeBody, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    # 1. Fetch Tier and Limits
    cur.execute("SELECT tier, theme_changes_count, theme_reset_date FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    tier = row[0] or "free"
    count = row[1] or 0
    reset_date = row[2]
    today = datetime.date.today()
    
    # Reset limit if 30 days have passed
    if not reset_date or (today - reset_date).days >= 30:
        count = 0; reset_date = today
        
    # Enforce Limits
    if tier == "pro" and count >= 10:
        cur.close(); conn.close()
        return {"success": False, "error": "Pro limit reached (10/month). Resets next month."}
    elif tier == "paid" and count >= 4:
        cur.close(); conn.close()
        return {"success": False, "error": "Paid limit reached (4/month). Resets next month."}

    try:
        # 2. Prepare the Image for Gemini
        image_bytes = base64.b64decode(body.image_b64)
        
        # 3. The Elite UI/UX Designer Prompt
        # 3. The Strict Color-Enforced Prompt
        system_prompt = """
        You are an elite UI/UX designer specializing in Neumorphism (Soft UI).
        Analyze the uploaded image. Extract a beautiful, highly accessible color palette inspired by its mood.
        
        CRITICAL MATHEMATICAL RULES FOR NEUMORPHISM:
        1. `bg`: MUST be extracted from one of the dominant soft, relaxing colored elements actually present in the image (e.g., a soft sage green, a warm sunset peach, a deep ocean blue, a dusty rose). ABSOLUTELY NO PURE WHITE (#FFFFFF), OFF-WHITE, PURE BLACK (#000000), OR PLAIN GREY. It must be a noticeably tinted, relaxing mid-tone color.
        2. `shadowDark`: Must be the exact `bg` color but 15-25% darker.
        3. `shadowLight`: Must be the exact `bg` color but 10-20% lighter.
        4. `text`: Must have a very high contrast ratio against `bg` (e.g., very dark if bg is light, or very light if bg is dark).
        5. `subtext`: A muted, slightly transparent-looking version of `text`.
        6. `accent`: The most vibrant, beautiful pop of color from the image.
        7. `accentText`: A color that is perfectly readable when placed on top of the `accent` color.
        8. `tag`: A subtle variation of the `bg` color.
        9. `streakOn`: Same as `accent`.
        10. `streakOff`: A highly desaturated, greyed-out version of `streakOn`.
        11. `placeholder`: An rgba string based on `text` at 40% opacity (e.g., "rgba(200, 200, 200, 0.4)").
        12. `bgRGB`: The `bg` color converted to exact RGB numbers ONLY (e.g., "224, 229, 236"). NO parentheses.
        13. `selectionBg`: An rgba string of the `accent` color at 30% opacity (e.g., "rgba(255, 100, 100, 0.3)").
        """
        
        client = Client()
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite', # 🟢 FIXED: This is the correct official model name!
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=body.mime_type),
                system_prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ThemeSchema,
                temperature=0.2
            )
        )
        
        theme_json = json.loads(response.text)
        new_count = count + 1
        
        # 5. Save to Database
        cur.execute("""
            UPDATE users SET custom_theme = %s, theme_changes_count = %s, theme_reset_date = %s WHERE id = %s
        """, (json.dumps(theme_json), new_count, reset_date, user_id))
        conn.commit()
        
        return {"success": True, "theme": theme_json, "used": new_count}
        
    except Exception as e:
        print(f"❌ Theme Gen Error: {e}")
        return {"success": False, "error": "AI failed to generate theme. Please try a different image."}
    finally:
        cur.close(); conn.close()

# ─── REAL-TIME SHORT QUESTION ───
class RealTimeQuestionBody(BaseModel):
    content: str

class RealTimeQuestionSchema(BaseModel):
    question: str

@app.post("/profile/journal/ai-question")
def journal_realtime_question(body: RealTimeQuestionBody, user=Depends(get_current_user)):
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT tier FROM users WHERE id = %s", (user_id,))
    tier = cur.fetchone()[0] or "free"
    cur.close(); conn.close()
    
    if tier != "pro": return {"success": False, "error": "Pro only"}

    try:
        system_prompt = """
        You are a DBT therapist. Read the user's journal snippet. 
        Output ONLY ONE short, gentle, non-judgmental question encouraging them to think deeper about what they just wrote. 
        Max 2 sentences. No analysis.
        """
        client = Client()
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=[f"Current text: {body.content}", system_prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RealTimeQuestionSchema,
                temperature=0.3
            )
        )
        return {"success": True, "question": json.loads(response.text)["question"]}
    except Exception as e:
        return {"success": False}

# ─── POST-SAVE DEEP ANALYSIS ───
class PostSaveAnalysisBody(BaseModel):
    content: str

class PostSaveAnalysisSchema(BaseModel):
    validation: str
    distortions: list[str]
    trend_insight: str
    guiding_question: str

@app.post("/profile/journal/ai-analysis")
def journal_post_save_analysis(body: PostSaveAnalysisBody, user=Depends(get_current_user)):
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT tier FROM users WHERE id = %s", (user_id,))
        tier = cur.fetchone()[0] or "free"
        
        if tier not in ["pro", "paid"]:
            return {"success": False, "error": "Premium feature only"}

        # Fetch last 10 entries for trend analysis
        cur.execute("SELECT created_at, content FROM journal_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT 10", (user_id,))
        past_entries = [{"date": r[0].isoformat(), "content": r[1]} for r in cur.fetchall()]
        
        # 🟢 FIXED: Removed the premature connection close from right here!

        system_prompt = f"""
        You are an empathetic CBT/DBT therapist.
        Recent History: {json.dumps(past_entries)}
        
        Analyze the user's just-saved entry.
        1. Validate their specific struggle warmly.
        2. Flag if they are falling into CBT distortions (e.g., "All-or-Nothing" thinking).
        3. Remind them of how they felt recently based on the history to show progress or recurring triggers.
        4. Ask a gentle DBT question to push reflection further.
        """
        
        client = Client()
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=[f"Saved Entry: {body.content}", system_prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PostSaveAnalysisSchema,
                temperature=0.4
            )
        )
        
        analysis_data = json.loads(response.text)

        # 🟢 Save the AI analysis into the database, attaching it to the entry we just made
        cur.execute("""
            UPDATE journal_logs 
            SET ai_analysis = %s 
            WHERE user_id = %s AND content = %s
        """, (json.dumps(analysis_data), user_id, body.content))
        conn.commit()

        return {"success": True, "analysis": analysis_data}
        
    except Exception as e:
        print("Analysis error:", e)
        return {"success": False}
    finally:
        # 🟢 FIXED: Connection is safely closed at the very end!
        cur.close()
        conn.close()


@app.get("/profile/ai-reports")
def get_ai_reports(offset: int = 0, limit: int = 5, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    cur.execute("""
        SELECT id, report_data, created_at 
        FROM ai_reports 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset))
    
    reports = []
    for r in cur.fetchall():
        reports.append({
            "id": r[0],
            "data": r[1],
            "date": r[2].isoformat() if hasattr(r[2], 'isoformat') else str(r[2])
        })
        
    cur.close()
    conn.close()
    return {"success": True, "reports": reports}

    # ─── SECURE ENCRYPTION SETUP ───
# ─── SECURE ENCRYPTION CLIENT ───
# ─── SECURE ENCRYPTION CLIENT ───
# ─── SECURE ENCRYPTION CLIENT ───
# ─── SECURE ENCRYPTION CLIENT ───
# ─── SECURE ENCRYPTION CLIENT ───
try:
    encryption_key = os.getenv("ENCRYPTION_KEY", "")
    cipher_suite = Fernet(encryption_key.encode('utf-8'))
except Exception as exc:
    print("⚠️ Startup Warning: Invalid or missing ENCRYPTION_KEY in your .env file.")
    print("Generating a temporary on-the-fly encryption key for local testing tracking...")
    fallback_key = Fernet.generate_key()
    cipher_suite = Fernet(fallback_key)

def encrypt_text(text: str) -> str:
    return cipher_suite.encrypt(text.encode('utf-8')).decode('utf-8')

def decrypt_text(encrypted_text: str) -> str:
    try:
        return cipher_suite.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except Exception:
        return "[Message could not be decrypted]"

# ─── CHAT ENDPOINTS ───

@app.get("/profile/coach/disclaimer")
def check_disclaimer(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    user_id = int(user["sub"])
    
    cur.execute("SELECT accepted_coach_disclaimer, tier FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
        
    tier = row[1] or "free"
    if tier != "pro":
        raise HTTPException(status_code=403, detail="The AI Well-Being Coach is a Pro tier feature.")
        
    return {"accepted": row[0] or False}

@app.post("/profile/coach/disclaimer")
def accept_disclaimer(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET accepted_coach_disclaimer = TRUE WHERE id = %s", (int(user["sub"]),))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}

@app.get("/profile/coach/sessions")
def get_sessions(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title, created_at FROM chat_sessions WHERE user_id = %s ORDER BY updated_at DESC", (int(user["sub"]),))
    sessions = [{"id": r[0], "title": r[1], "date": r[2].isoformat() if hasattr(r[2], 'isoformat') else str(r[2])} for r in cur.fetchall()]
    cur.close()
    conn.close()
    return {"sessions": sessions}

@app.post("/profile/coach/sessions")
def create_session(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO chat_sessions (user_id, title) VALUES (%s, %s) RETURNING id", (int(user["sub"]), "New Wellness Chat"))
    session_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": session_id, "title": "New Wellness Chat"}

@app.delete("/profile/coach/sessions/{session_id}")
def delete_session(session_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM chat_sessions WHERE id = %s AND user_id = %s", (session_id, int(user["sub"])))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}

@app.get("/profile/coach/sessions/{session_id}")
def get_messages(session_id: int, user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s", (session_id, int(user["sub"])))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized access to this session.")
        
    cur.execute("""
        SELECT m.id, m.role, m.content, m.reply_to_id, r.content as reply_content, m.created_at 
        FROM chat_messages m
        LEFT JOIN chat_messages r ON m.reply_to_id = r.id
        WHERE m.session_id = %s ORDER BY m.created_at ASC
    """, (session_id,))
    
    messages = []
    for r in cur.fetchall():
        messages.append({
            "id": r[0],
            "role": r[1],
            "content": decrypt_text(r[2]),
            "reply_to_id": r[3],
            "reply_content": decrypt_text(r[4]) if r[4] else None,
            "date": r[5].isoformat() if hasattr(r[5], 'isoformat') else str(r[5])
        })
    cur.close()
    conn.close()
    return {"messages": messages}


# ─── THE NEW MEGA-PROMPT SCHEMAS ───
class ChatMessageBody(BaseModel):
    content: str
    reply_to_id: Optional[int] = None

class CoachResponseSchema(BaseModel):
    is_crisis: bool
    suggested_title: Optional[str]
    coach_reply: str

@app.post("/profile/coach/sessions/{session_id}/message")
def send_coach_message(session_id: int, body: ChatMessageBody, user=Depends(get_current_user)):
    user_id = int(user["sub"])
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT tier FROM users WHERE id = %s", (user_id,))
        tier_row = cur.fetchone()
        if not tier_row or tier_row[0] != "pro":
            raise HTTPException(status_code=403, detail="Pro tier subscription verification required.")

        # 1. Collect session history
        cur.execute("SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC LIMIT 20", (session_id,))
        rows = cur.fetchall()
        is_first_message = len(rows) == 0
        
        conversation_context = []
        for r in rows:
            # 🟢 FIXED: Explicit fallback handling for 'crisis_system' and alternate structural roles
            db_role = r[0]
            if db_role in ["coach", "model", "crisis_system"]:
                role_tag = "model"
            else:
                role_tag = "user"
                
            msg_text = decrypt_text(r[1])
            conversation_context.append(
                types.Content(role=role_tag, parts=[types.Part.from_text(text=msg_text)])
            )

        # 🟢 NEW: Check if the current message is a thread reply to an existing message row
        parent_context_str = ""
        if body.reply_to_id:
            cur.execute("SELECT role, content FROM chat_messages WHERE id = %s", (body.reply_to_id,))
            parent_row = cur.fetchone()
            if parent_row:
                parent_context_str = f"[Replying directly to previous comment: \"{decrypt_text(parent_row[1])}\"]\n"

        # Combine thread context with the user's fresh message input text
        full_user_input = f"{parent_context_str}{body.content}"

        # 2. 🟢 ONE API CALL TO RULE THEM ALL
        system_prompt = f"""
        You are an AI Mental Wellness Coach and Mindfulness Companion.
        You must evaluate the user's message and generate a JSON response handling 3 tasks at once.
        
        TASK 1: CRISIS DETECTION
        If the user indicates active self-harm, suicide intent, or severe life-threatening crisis, set `is_crisis` to true. Otherwise, false.
        
        TASK 2: TITLE GENERATION
        Is this the first message in the chat? {'YES' if is_first_message else 'NO'}.
        If YES, generate a short 3-word title for `suggested_title`. If NO, set it to null.
        
        TASK 3: COACH REPLY
        If `is_crisis` is true: Output a supportive message urging them to dial 988 or contact emergency services immediately, stating you cannot provide emergency care.
        If `is_crisis` is false: Respond empathetically, practically, and concisely to help them practice mindfulness. DO NOT diagnose or prescribe treatment.
        """

        client = Client()
        
        # Append user message
        conversation_context.append(
            types.Content(role="user", parts=[types.Part.from_text(text=body.content)])
        )

        response = client.models.generate_content(
            model='gemini-3.1-flash-lite', # 🟢 Using the exact model you requested
            contents=conversation_context,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt, 
                temperature=0.5,
                response_mime_type="application/json",
                response_schema=CoachResponseSchema
            )
        )
        
        # 3. Unpack the single JSON response
        ai_data = json.loads(response.text)
        is_crisis = ai_data.get("is_crisis", False)
        ai_reply = ai_data.get("coach_reply", "I am here for you.")
        new_title = ai_data.get("suggested_title")

        # 4. Process the Title Update
        if new_title and is_first_message:
            cur.execute("UPDATE chat_sessions SET title = %s WHERE id = %s", (new_title, session_id))

        # 5. Save the Chats Securely
        cur.execute("INSERT INTO chat_messages (session_id, role, content, reply_to_id) VALUES (%s, %s, %s, %s) RETURNING id", 
                   (session_id, "user", encrypt_text(body.content), body.reply_to_id))
                   
        final_role = "crisis_system" if is_crisis else "coach"
        cur.execute("INSERT INTO chat_messages (session_id, role, content) VALUES (%s, %s, %s)", 
                   (session_id, final_role, encrypt_text(ai_reply)))
                   
        cur.execute("UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (session_id,))
        
        conn.commit()
        return {"role": final_role, "content": ai_reply, "is_crisis": is_crisis}

    except Exception as e:
        err_str = str(e)
        print("AI Coach Controller execution failure:", err_str)
        if "429" in err_str:
            return {"error": "Google API Rate Limit Exceeded. You have sent too many messages quickly. Please wait a moment."}
        return {"error": "The AI Coach service is currently busy. Please send your message one more time!"}
    finally:
        cur.close()
        conn.close()