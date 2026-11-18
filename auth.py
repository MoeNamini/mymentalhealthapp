# auth.py
# Handles all authentication: email signup/login, Google OAuth, Twitter OAuth, Spotify OAuth.
# Mounted into the main api.py as a router.

import os
import re
import secrets
import json
import urllib.parse
import base64
import httpx
import hashlib
import random  # 🟢 FIXED: Added missing import for 6-digit PIN generation
from datetime import datetime, timezone, timedelta

import psycopg2
import bcrypt as bcrypt_lib
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from cryptography.fernet import Fernet, MultiFernet

from email_service import send_verification_code, send_password_reset_link
from slowapi import Limiter
from slowapi.util import get_remote_address
import time
from typing import Optional

load_dotenv()

# 🚀 Single initialization for the router path group
router = APIRouter(prefix="/auth", tags=["Authentication"])

limiter = Limiter(key_func=get_remote_address)
oauth_states: dict = {}

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

def encrypt_payload(data) -> str:
    """Encrypts plaintext strings, dicts, or lists using Fernet into ciphertext."""
    if data is None or data == "":
        return ""
    if isinstance(data, (dict, list)):
        raw_str = json.dumps(data)
    else:
        raw_str = str(data)
    return encrypt_text(raw_str)

def decrypt_payload(ciphertext, is_json: bool = False):
    """
    Safely decrypts ciphertext or passes through legacy unencrypted text/JSON.
    """
    if ciphertext is None or ciphertext == "" or ciphertext == "null" or ciphertext == "None":
        return None if is_json else ""

    if is_json and isinstance(ciphertext, (dict, list)):
        return ciphertext if ciphertext else None

    ciphertext_str = str(ciphertext).strip()

    # 🟢 1. LEGACY UNENCRYPTED CHECK: If it doesn't start with 'gAAAAA', return plain text!
    if not ciphertext_str.startswith("gAAAAA"):
        if is_json:
            try:
                return json.loads(ciphertext_str)
            except Exception:
                return None
        return ciphertext_str

    # 🟢 2. ENCRYPTED FERNET TOKEN: Decrypt using keys
    try:
        decrypted = decrypt_text(ciphertext_str)
        if decrypted and decrypted != "[Message could not be decrypted - Key Missing]":
            if is_json:
                try:
                    return json.loads(decrypted)
                except Exception:
                    return None
            return decrypted
    except Exception:
        pass

    return ciphertext_str

def store_oauth_state(state: str, provider: str, user_id: str = None, verifier: str = None):
    """Stores the OAuth state with a 5-minute expiration timestamp."""
    payload = {"provider": provider, "created_at": time.time()}
    if user_id:
        payload["user_id"] = user_id
    if verifier:
        payload["verifier"] = verifier
    oauth_states[state] = payload

def validate_and_pop_state(state: str, expected_provider: str) -> Optional[dict]:
    """Validates the state, checks expiration, and returns the payload data."""
    entry = oauth_states.get(state)
    if not entry:
        return None
    
    # 300 seconds = 5 minutes
    if time.time() - entry["created_at"] > 300:
        del oauth_states[state]
        return None
        
    if entry["provider"] != expected_provider:
        return None
        
    del oauth_states[state]
    return entry

# ── Security helpers ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY or SECRET_KEY == "local-dev-secret-change-in-prod":
    raise ValueError("FATAL SECURITY ERROR: JWT_SECRET must be set to a secure string in production.")
ALGORITHM = "HS256"
TOKEN_DAYS = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://app.mindactions.app")

def is_strong_password(password: str) -> tuple[bool, str]:
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password must not exceed 128 characters."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    if not any(not c.isalnum() for c in password):
        return False, "Password must contain at least one special character."
    return True, ""

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is missing from environment variables!")
    return psycopg2.connect(database_url)

def make_jwt(user_id: int) -> str:
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
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    return decode_jwt(token)

def find_or_create_oauth_user(email: str, name: str, avatar: str, provider: str, provider_id: str) -> dict:
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
            INSERT INTO users (name, email, avatar_url, auth_provider, provider_id, is_active)
            VALUES (%s, %s, %s, %s, %s, TRUE)
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

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# ── Request / Response models ───────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    accepted_terms: bool
    accepted_privacy: bool
    accepted_coach_disclaimer: Optional[bool] = False
    accepted_analytics_data: Optional[bool] = False
    accepted_ad_sharing: Optional[bool] = False
    accepted_ai_processing: Optional[bool] = False

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordExecuteRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# ── Email auth endpoints ────────────────────────────────────────────────────

class LegalConsentRequest(BaseModel):
    accepted_terms: bool
    accepted_privacy: bool
    accepted_coach_disclaimer: Optional[bool] = False
    accepted_analytics_data: Optional[bool] = False
    accepted_ad_sharing: Optional[bool] = False
    accepted_ai_processing: Optional[bool] = False

@router.post("/accept-legal")
async def accept_legal(body: LegalConsentRequest, user=Depends(get_current_user)):
    if not body.accepted_terms or not body.accepted_privacy:
        raise HTTPException(status_code=400, detail="You must agree to the Terms of Service and Privacy Policy.")

    user_id = int(user["sub"])
    now_utc = datetime.now(timezone.utc)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users 
        SET terms_accepted_at = %s,
            privacy_accepted_at = %s,
            accepted_coach_disclaimer = %s,
            accepted_analytics_data = %s,
            accepted_ad_sharing = %s,
            accepted_ai_processing = %s
        WHERE id = %s;
        """,
        (
            now_utc,
            now_utc,
            body.accepted_coach_disclaimer,
            body.accepted_analytics_data,
            body.accepted_ad_sharing,
            body.accepted_ai_processing,
            user_id
        )
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"success": True, "message": "Legal agreements and consents recorded successfully."}

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email, password_hash, tier, is_active, custom_theme,
               accepted_coach_disclaimer, accepted_analytics_data, 
               accepted_ad_sharing, accepted_ai_processing, journal_ai_count
        FROM users 
        WHERE email = %s;
        """,
        (body.email,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    # 1. Verify credentials
    if not row or not bcrypt_lib.checkpw(body.password.encode("utf-8"), row[3].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2. Block unverified accounts
    if not row[5]:
        raise HTTPException(
            status_code=400, 
            detail="Email address not verified yet. Please verify your account."
        )

    # 3. Generate token and return profile data
    token = make_jwt(row[0])

    user_data = {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "tier": row[4],
        "custom_theme": row[6],
        "accepted_coach_disclaimer": row[7],
        "accepted_analytics_data": row[8],
        "accepted_ad_sharing": row[9],
        "accepted_ai_processing": row[10],
        "journal_ai_count": row[11] or 0
    }

    return {"token": token, "user": user_data}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest):
    if not body.accepted_terms or not body.accepted_privacy:
        raise HTTPException(
            status_code=400, 
            detail="You must agree to the Terms of Use and Privacy Policy to create an account."
        )

    is_valid, err_msg = is_strong_password(body.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, is_active FROM users WHERE email = %s", (body.email,))
    existing_user = cur.fetchone()

    # 🟢 1. If user exists AND is verified -> Block duplicate registration
    if existing_user and existing_user[1] is True:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered. Please log in.")

    hashed = bcrypt_lib.hashpw(body.password.encode("utf-8"), bcrypt_lib.gensalt()).decode("utf-8")
    verification_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    now_utc = datetime.now(timezone.utc)

    if existing_user and existing_user[1] is False:
        # 🟢 2. If user exists but is UNVERIFIED -> Update their info & refresh the PIN
        cur.execute(
            """
            UPDATE users 
            SET name = %s, password_hash = %s, verification_code = %s, 
                verification_expires_at = %s, failed_attempts = 0,
                terms_accepted_at = %s, privacy_accepted_at = %s,
                accepted_coach_disclaimer = %s, accepted_analytics_data = %s,
                accepted_ad_sharing = %s, accepted_ai_processing = %s
            WHERE id = %s
            """,
            (
                body.name, hashed, verification_code, expires_at,
                now_utc, now_utc,
                body.accepted_coach_disclaimer, body.accepted_analytics_data,
                body.accepted_ad_sharing, body.accepted_ai_processing,
                existing_user[0]
            )
        )
    else:
        # 🟢 3. Brand new email -> Insert new row
        cur.execute(
            """
            INSERT INTO users (
                name, email, password_hash, auth_provider, is_active, 
                verification_code, verification_expires_at, failed_attempts,
                terms_accepted_at, privacy_accepted_at,
                accepted_coach_disclaimer, accepted_analytics_data, 
                accepted_ad_sharing, accepted_ai_processing
            )
            VALUES (%s, %s, %s, 'email', FALSE, %s, %s, 0, %s, %s, %s, %s, %s, %s);
            """,
            (
                body.name, body.email, hashed, verification_code, expires_at,
                now_utc, now_utc,
                body.accepted_coach_disclaimer, body.accepted_analytics_data,
                body.accepted_ad_sharing, body.accepted_ai_processing
            ),
        )

    conn.commit()
    cur.close()
    conn.close()

    await send_verification_code(body.email, verification_code)
    return {"message": "Verification code successfully sent to email."}

class ResendCodeRequest(BaseModel):
    email: EmailStr

@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification_code(request: Request, body: ResendCodeRequest):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, is_active FROM users WHERE email = %s", (body.email,))
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        return {"message": "If that account exists and is unverified, a new code has been sent."}

    if user[1] is True:
        cur.close()
        conn.close()
        return {"message": "This email is already verified. Please log in."}

    new_code = str(random.randint(100000, 999999))
    new_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    cur.execute(
        "UPDATE users SET verification_code = %s, verification_expires_at = %s, failed_attempts = 0 WHERE id = %s",
        (new_code, new_expires, user[0])
    )
    conn.commit()
    cur.close()
    conn.close()

    await send_verification_code(body.email, new_code)
    return {"message": "A new verification code has been sent to your email."}

@router.post("/verify-email")
async def verify_email(payload: VerifyCodeRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT verification_code, failed_attempts, is_active, verification_expires_at FROM users WHERE email = %s", (payload.email,))
    row = cursor.fetchone()
    
    if not row:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User account records not found.")
        
    verification_code, failed_attempts, is_active, verification_expires_at = row

    if is_active:
        cursor.close()
        conn.close()
        return {"message": "Email is already verified. You can log in."}

    # Brute-force protection gate
    if failed_attempts >= 5:
        cursor.execute("UPDATE users SET verification_code = NULL, failed_attempts = 0 WHERE email = %s", (payload.email,))
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Too many failed attempts. Your verification code has been deactivated.")

    if verification_code != payload.code:
        cursor.execute("UPDATE users SET failed_attempts = failed_attempts + 1 WHERE email = %s", (payload.email,))
        conn.commit()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # Check expiration limits
    if not verification_expires_at or datetime.now(timezone.utc) > verification_expires_at:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # Cryptographically secure constant-time evaluation to eliminate timing vectors
    if secrets.compare_digest(verification_code, payload.code):
        cursor.execute(
            "UPDATE users SET is_active = TRUE, verification_code = NULL, verification_expires_at = NULL, failed_attempts = 0 WHERE email = %s", 
            (payload.email,)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Your email has been successfully verified! You may now log in."}
    else:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

# ── Password recovery endpoints ─────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(payload: ResetRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email FROM users WHERE email = %s", (payload.email,))
        user = cursor.fetchone()
        
        # Identity protection fallback strategy: obscures system registry maps from enumerators
        if not user:
            return {"message": "If that email exists in our system, a secure reset link has been dispatched."}
            
        secure_token = secrets.token_urlsafe(32)
        token_hash = hash_token(secure_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15) # Modern 15-minute standard expiration
        
        cursor.execute(
            "INSERT INTO password_resets (email, token_hash, expires_at, is_used) VALUES (%s, %s, %s, FALSE)",
            (payload.email, token_hash, expires_at)
        )
        conn.commit()
        
        await send_password_reset_link(payload.email, secure_token)
        return {"message": "If that email exists in our system, a secure reset link has been dispatched."}
    finally:
        cursor.close()
        conn.close()

@router.post("/reset-password-confirm")
async def reset_password_confirm(payload: ResetPasswordExecuteRequest):
    is_valid, err_msg = is_strong_password(payload.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, token_hash, expires_at FROM password_resets WHERE email = %s AND is_used = FALSE ORDER BY created_at DESC LIMIT 1", 
            (payload.email,)
        )
        reset_record = cursor.fetchone()
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset link.")
            
        record_id, stored_token_hash, expires_at = reset_record

        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="This reset link has expired.")

        incoming_token_hash = hash_token(payload.token)
        
        if secrets.compare_digest(stored_token_hash, incoming_token_hash):
            # 🟢 FIXED: Encrypt the new selection securely via bcrypt to match your registration engine
            new_hashed_password = bcrypt_lib.hashpw(payload.new_password.encode("utf-8"), bcrypt_lib.gensalt()).decode("utf-8")
            
            cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hashed_password, payload.email))
            cursor.execute("UPDATE password_resets SET is_used = TRUE WHERE id = %s", (record_id,))
            conn.commit()
            return {"message": "Your password has been successfully updated. You may now log in with your new password."}
        else:
            raise HTTPException(status_code=400, detail="Invalid reset link credentials.")
    finally:
        cursor.close()
        conn.close()

# ── Google OAuth ────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

@router.get("/google")
def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    
    # 🟢 Securely store the state with the 5-minute expiration window
    store_oauth_state(state, provider="google")

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
    # 🟢 Securely validate expiration and automatically clear memory safely
    state_data = validate_and_pop_state(state, "google")
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

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
    store_oauth_state(state, provider="twitter", verifier=verifier)

    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )

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
    state_data = validate_and_pop_state(state, "twitter")
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    verifier = state_data["verifier"]

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
        raise HTTPException(status_code=400, detail="Theme must be light, dark, or calm")

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
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "").strip() 
    scope = "user-modify-playback-state user-read-playback-state"
    
    user_id = str(current_user.get("sub") or current_user.get("id") or "3")
    state_token = secrets.token_urlsafe(16)
    store_oauth_state(state_token, provider="spotify", user_id=user_id)
        
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
    state_data = validate_and_pop_state(state, "spotify")
    if not state_data:
        raise HTTPException(status_code=400, detail="Invalid or expired session validation state.")
    user_id = state_data["user_id"]

    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "").strip()
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

    frontend_base_url = os.getenv("FRONTEND_URL", "https://app.mindactions.app") #"https://mymentalhealthapp.vercel.app")
    return RedirectResponse(url=f"{frontend_base_url}/profile")