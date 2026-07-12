# auth.py
# Handles all authentication: email signup/login, Google OAuth, Twitter OAuth, Spotify OAuth.
# Mounted into the main api.py as a router.

import os
import re
import secrets
import urllib.parse
import base64
import httpx
from datetime import datetime, timezone, timedelta

import psycopg2
import bcrypt as bcrypt_lib
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from cryptography.fernet import Fernet, MultiFernet

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

# ─── SECURE MULTI-KEY ENCRYPTION ENGINE ───
raw_keys_str = os.getenv("ENCRYPTION_KEYS")

if not raw_keys_str:
    raise ValueError("FATAL SECURITY ERROR: ENCRYPTION_KEYS missing from environment variables.")

key_list = [k.strip() for k in raw_keys_str.split(",") if k.strip()]

try:
    fernet_instances = [Fernet(k.encode('utf-8')) for k in key_list]
    cipher_suite = MultiFernet(fernet_instances)
except Exception as e:
    raise ValueError(f"FATAL SECURITY ERROR: Invalid Fernet key format in .env list. Details: {e}")

def encrypt_text(text: str) -> str:
    """Encrypts plaintext strings using the active primary key."""
    if not text:
        return ""
    return cipher_suite.encrypt(text.encode('utf-8')).decode('utf-8')

def decrypt_text(encrypted_text: str) -> str:
    """Decrypts strings safely via key rotation waterfall."""
    if not encrypted_text:
        return ""
    try:
        return cipher_suite.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except Exception:
        return "[Message could not be decrypted - Key Missing]"

# ── Security helpers ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY or SECRET_KEY == "local-dev-secret-change-in-prod":
    raise ValueError("FATAL SECURITY ERROR: JWT_SECRET must be set to a secure string in production.")
ALGORITHM = "HS256"
TOKEN_DAYS = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# In-memory store for OAuth state params
oauth_states: dict = {}

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(
            status_code=500, 
            detail="DATABASE_URL is missing from environment variables!"
        )
    return psycopg2.connect(database_url)

def make_jwt(user_id: int) -> str:
    """🟢 SECURE: Only encodes the user ID constraint, preventing data leakages."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
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
    Returns the decoded token containing {'sub': user_id}
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    return decode_jwt(token)

def find_or_create_oauth_user(
    email: str, name: str, avatar: str, provider: str, provider_id: str
) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name, email, theme FROM users WHERE email = %s", (email,))
    row = cur.fetchone()

    if row:
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

    # 🟢 FIXED: Removed excess arguments to match the secure make_jwt signature
    token = make_jwt(row[0]) 
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

    # 🟢 FIXED: Removed excess arguments to match the secure make_jwt signature
    token = make_jwt(row[0])
    return {
        "token": token,
        "user": {"id": row[0], "name": row[1], "email": row[2], "theme": row[4]},
    }

# ── Google OAuth ────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

@router.get("/google")
def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    oauth_states[state] = {"provider": "google"}

    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/google/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/google/callback"

    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
    }
    
    query = urllib.parse.urlencode(params)
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")

@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request):
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    del oauth_states[state]

    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/google/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/google/callback"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Google token exchange failed")

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

    # 🟢 FIXED: Removed excess token strings
    jwt_token = make_jwt(user["id"])
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")

# ── Twitter OAuth 2.0 ───────────────────────────────────────────────────────

TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
TWITTER_USER_URL = "https://api.twitter.com/2/users/me"

@router.get("/twitter")
def twitter_login(request: Request):
    state = secrets.token_urlsafe(16)
    verifier = secrets.token_urlsafe(32)
    oauth_states[state] = {"provider": "twitter", "verifier": verifier}

    import hashlib
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )

    # 🟢 DYNAMIC: Toggles Twitter redirects automatically for Render
    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/twitter/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/twitter/callback"

    params = {
        "response_type": "code",
        "client_id": os.getenv("TWITTER_CLIENT_ID"),
        "redirect_uri": redirect_uri,
        "scope": "tweet.read users.read offline.access",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    query = urllib.parse.urlencode(params)
    return RedirectResponse(f"{TWITTER_AUTH_URL}?{query}")

@router.get("/twitter/callback")
async def twitter_callback(code: str, state: str, request: Request):
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    verifier = oauth_states[state]["verifier"]
    del oauth_states[state]

    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")

    host = request.headers.get("host", "localhost:8000")
    if "localhost" in host or "127.0.0.1" in host:
        redirect_uri = "http://localhost:8000/auth/twitter/callback"
    else:
        redirect_uri = "https://mindactions-api.onrender.com/auth/twitter/callback"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            TWITTER_TOKEN_URL,
            data={
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
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

    email = f"twitter_{t_user.get('id')}@twitter.local"

    user = find_or_create_oauth_user(
        email=email,
        name=t_user.get("name", "Twitter User"),
        avatar=t_user.get("profile_image_url", ""),
        provider="twitter",
        provider_id=str(t_user.get("id")),
    )

    # 🟢 FIXED: Removed excess token strings
    jwt_token = make_jwt(user["id"])
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
    return {"message": "Logged out successfully"}

@router.patch("/theme")
async def update_theme(request: Request, user=Depends(get_current_user)):
    body = await request.json()
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
@router.get("/spotify/url")
def get_spotify_url(current_user = Depends(get_current_user)):
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI") 
    scope = "user-modify-playback-state user-read-playback-state"
    
    user_id = str(current_user.get("sub") or current_user.get("id") or "3")
        
    # 🟢 FIXED: Generate an unguessable nonce and lock the provider + user session context
    state_token = secrets.token_urlsafe(16)
    oauth_states[state_token] = {"provider": "spotify", "user_id": user_id}
        
    params = {
        "response_type": "code",
        "client_id": client_id,
        "scope": scope,
        "redirect_uri": redirect_uri,
        "state": state_token 
    }
    query_string = urllib.parse.urlencode(params)
    return {"url": f"https://accounts.spotify.com/authorize?{query_string}"}

@router.get("/spotify/callback")
async def spotify_callback(request: Request, code: str, state: str = None):
    # 🟢 FIXED: Rigid cross-verification validation checks
    if not state or state not in oauth_states or oauth_states[state]["provider"] != "spotify":
        raise HTTPException(status_code=400, detail="Invalid or expired session validation state.")
        
    user_id = oauth_states[state]["user_id"]
    del oauth_states[state] # Housekeeping cleanup

    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri
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

    encrypted_access = encrypt_text(access_token)
    encrypted_refresh = encrypt_text(refresh_token) if refresh_token else None

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET spotify_access_token = %s, spotify_refresh_token = %s WHERE id = %s",
        (encrypted_access, encrypted_refresh, int(user_id))
    )
    conn.commit()
    cur.close()
    conn.close()

    frontend_base_url = os.getenv("FRONTEND_URL", "https://mymentalhealthapp.vercel.app")
    return RedirectResponse(url=f"{frontend_base_url}/profile")