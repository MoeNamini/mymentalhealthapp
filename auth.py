# auth.py
# Handles all authentication: email signup/login, Google OAuth, Twitter OAuth.
# Mounted into the main api.py as a router.

import os
import secrets
import httpx
from datetime import datetime, timedelta

import psycopg2
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
import bcrypt as bcrypt_lib
from pydantic import BaseModel

from sqlalchemy.orm import Session

import urllib.parse
import httpx
import base64

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Security helpers ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "local-dev-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_DAYS = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# In-memory store for OAuth state params (fine for local demo)
# Maps state_token → {"provider": "google"|"twitter", "pkce_verifier": ...}
oauth_states: dict = {}


def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        raise HTTPException(
            status_code=500, 
            detail="DATABASE_URL is missing from environment variables!"
        )
        
    return psycopg2.connect(database_url)


def make_jwt(user_id: int, email: str, name: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(request: Request) -> dict:
    """
    Dependency — extracts and validates the JWT from the Authorization header.
    Use as: user = Depends(get_current_user) in any protected endpoint.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    return decode_jwt(token)


def find_or_create_oauth_user(
    email: str, name: str, avatar: str, provider: str, provider_id: str
) -> dict:
    """
    Looks up a user by email. Creates them if they don't exist.
    Returns the user row as a dict.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name, email, theme FROM users WHERE email = %s", (email,))
    row = cur.fetchone()

    if row:
        # Update last_login
        cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (row[0],))
        conn.commit()
        user = {"id": row[0], "name": row[1], "email": row[2], "theme": row[3]}
    else:
        cur.execute(
            """
            INSERT INTO users (name, email, avatar_url, auth_provider, provider_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, name, email, theme;
        """,
            (name, email, avatar, provider, provider_id),
        )
        row = cur.fetchone()
        conn.commit()
        user = {"id": row[0], "name": row[1], "email": row[2], "theme": row[3]}

    cur.close()
    conn.close()
    return user


# ── Request / Response models ───────────────────────────────────────────────


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Email auth endpoints ────────────────────────────────────────────────────


@router.post("/signup")
def signup(body: SignupRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = bcrypt_lib.hashpw(
        body.password.encode("utf-8"), bcrypt_lib.gensalt()
    ).decode("utf-8")
    cur.execute(
        """
        INSERT INTO users (name, email, password_hash, auth_provider)
        VALUES (%s, %s, %s, 'email')
        RETURNING id, name, email, theme;
    """,
        (body.name, body.email, hashed),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    token = make_jwt(row[0], row[2], row[1])
    return {
        "token": token,
        "user": {"id": row[0], "name": row[1], "email": row[2], "theme": row[3]},
    }


@router.post("/login")
def login(body: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email, password_hash, theme
        FROM users WHERE email = %s AND auth_provider = 'email'
    """,
        (body.email,),
    )
    row = cur.fetchone()

    if not row or not bcrypt_lib.checkpw(
        body.password.encode("utf-8"), row[3].encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (row[0],))
    conn.commit()
    cur.close()
    conn.close()

    token = make_jwt(row[0], row[2], row[1])
    return {
        "token": token,
        "user": {"id": row[0], "name": row[1], "email": row[2], "theme": row[4]},
    }


# ── Google OAuth ────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


from fastapi import Request  # 🟢 Ensure Request is imported at the top of your auth.py file

@router.get("/google")
def google_login(request: Request):  # 🟢 Added request context here
    state = secrets.token_urlsafe(16)
    oauth_states[state] = {"provider": "google"}

    # 🟢 DYNAMIC REDIRECT CHECK: Automatically toggles between local and cloud servers
    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/google/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/google/callback"

    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "redirect_uri": redirect_uri,  # 🟢 Using our new dynamic string variable
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
    }
    
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request):  # 🟢 FIX 1: Added request argument here!
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    del oauth_states[state]

    # 🟢 FIX 2: Moved the check up here and cleaned out the duplicate copy-paste block
    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/google/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/google/callback"

    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": redirect_uri,  # Uses the clean, dynamic variable
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Google token exchange failed")

        # Get user info
        user_res = await client.get(
            GOOGLE_USER_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        g_user = user_res.json()

    user = find_or_create_oauth_user(
        email=g_user.get("email"),
        name=g_user.get("name", "User"),
        avatar=g_user.get("picture", ""),
        provider="google",
        provider_id=g_user.get("sub"),
    )

    jwt_token = make_jwt(user["id"], user["email"], user["name"])
    # Redirect to frontend with token in URL — frontend extracts and stores it
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")


# ── Twitter OAuth 2.0 ───────────────────────────────────────────────────────

TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
TWITTER_USER_URL = "https://api.twitter.com/2/users/me"


@router.get("/twitter")
def twitter_login():
    state = secrets.token_urlsafe(16)
    # Simple PKCE verifier for Twitter OAuth 2.0
    verifier = secrets.token_urlsafe(32)
    oauth_states[state] = {"provider": "twitter", "verifier": verifier}

    import hashlib, base64

    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )

    params = {
        "response_type": "code",
        "client_id": os.getenv("TWITTER_CLIENT_ID"),
        "redirect_uri": "http://localhost:8000/auth/twitter/callback",
        "scope": "tweet.read users.read offline.access",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{TWITTER_AUTH_URL}?{query}")


@router.get("/twitter/callback")
async def twitter_callback(code: str, state: str):
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    verifier = oauth_states[state]["verifier"]
    del oauth_states[state]

    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            TWITTER_TOKEN_URL,
            data={
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": "http://localhost:8000/auth/twitter/callback",
                "code_verifier": verifier,
            },
            auth=(client_id, client_secret),
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Twitter token exchange failed")

        user_res = await client.get(
            f"{TWITTER_USER_URL}?user.fields=name,profile_image_url",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        t_user = user_res.json().get("data", {})

    # Twitter doesn't give email — we use a placeholder
    email = f"twitter_{t_user.get('id')}@twitter.local"

    user = find_or_create_oauth_user(
        email=email,
        name=t_user.get("name", "Twitter User"),
        avatar=t_user.get("profile_image_url", ""),
        provider="twitter",
        provider_id=str(t_user.get("id")),
    )

    jwt_token = make_jwt(user["id"], user["email"], user["name"])
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")


# ── Profile + preferences endpoints ────────────────────────────────────────


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, email, avatar_url, auth_provider, theme, created_at
        FROM users WHERE id = %s
    """,
        (int(user["sub"]),),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "avatar_url": row[3],
        "auth_provider": row[4],
        "theme": row[5],
        "created_at": row[6].isoformat(),
    }


@router.post("/logout")
def logout():
    # JWT is stateless — logout is handled on the frontend by deleting the token
    return {"message": "Logged out successfully"}


@router.patch("/theme")
async def update_theme(request: Request, user=Depends(get_current_user)):
    body = await request.json()  # Fixed — was using wrong sync pattern
    theme = body.get("theme")

    if theme not in ("light", "dark", "calm", "custom"):
        raise HTTPException(
            status_code=400, detail="Theme must be light, dark, or calm"
        )

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET theme = %s WHERE id = %s", (theme, int(user["sub"])))
    conn.commit()
    cur.close()
    conn.close()

    return {"theme": theme}



# ── Spotify OAuth 2.0 ───────────────────────────────────────────────────────
import urllib.parse
import httpx
import base64
from fastapi import Request
from fastapi.responses import RedirectResponse

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"

@router.get("/spotify/url")
def get_spotify_url(request: Request, user=Depends(get_current_user)):
    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/spotify/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/spotify/callback"

    state = str(user["sub"]) 

    params = {
        "client_id": os.getenv("SPOTIFY_CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": "user-modify-playback-state user-read-playback-state", 
        "show_dialog": "true"
    }
    
    query = urllib.parse.urlencode(params)
    return {"url": f"{SPOTIFY_AUTH_URL}?{query}"}

@router.get("/spotify/callback")
async def spotify_callback(code: str, state: str, request: Request):
    user_id = state

    # 1. 🟢 FIXED: Hardcoded directly to your production live backend endpoint
    redirect_uri = "https://mindactions-api.onrender.com/auth/spotify/callback"

    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={
                "Authorization": f"Basic {auth_str}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Spotify token exchange failed")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET spotify_access_token = %s, spotify_refresh_token = %s WHERE id = %s",
        (access_token, refresh_token, int(user_id))
    )
    conn.commit()
    cur.close()
    conn.close()

    # 2. 🟢 FIXED: Direct redirect straight to your production Vercel frontend view
    production_frontend = "https://mymentalhealthapp.vercel.app"
    return RedirectResponse(f"{production_frontend}/profile")