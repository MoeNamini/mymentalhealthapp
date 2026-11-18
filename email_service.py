import os
import resend
from fastapi import HTTPException

# Initialize the Resend SDK with your API key
resend.api_key = os.getenv("RESEND_API_KEY")

# The verified sending identity from your Resend Cloudflare setup
SENDER_IDENTITY = "MindActions <no-reply@mail.mindactions.app>"

async def send_verification_code(email: str, code: str):
    """Sends a 6-digit verification code to complete sign up."""
    resend.api_key = os.getenv("RESEND_API_KEY")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }}
            .container {{ max-width: 480px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }}
            .logo {{ font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px; }}
            .logo span {{ color: #4f46e5; }}
            h1 {{ font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 12px; text-align: center; }}
            p {{ color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: center; }}
            .code-box {{ font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px solid #e5e7eb; }}
            .footer {{ font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 24px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Mind<span>Actions</span></div>
            <h1>Verify your email</h1>
            <p>Welcome to MindActions! To complete your registration and secure your mental wellness dashboard, use the following 6-digit verification code:</p>
            <div class="code-box">{code}</div>
            <p style="font-size: 13px; color: #ef4444;">This code is sensitive and will expire in 10 minutes. Do not share it with anyone.</p>
            <div class="footer">
                &copy; 2026 MindActions. Securely managed. <br>
                If you did not request this email, please safely ignore it.
            </div>
        </div>
    </body>
    </html>
    """

    try:
        # Utilizing Resend's native async sender
        params: resend.Emails.SendParams = {
            "from": SENDER_IDENTITY,
            "to": [email],
            "subject": f"Your MindActions Verification Code: {code}",
            "html": html_content,
        }
        await resend.Emails.send_async(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {str(e)}")


async def send_password_reset_link(email: str, reset_token: str):
    """Sends a secure, timed URL wrapper to reset password."""
    resend.api_key = os.getenv("RESEND_API_KEY")
    
    # In production, point this to your React frontend URL
    # = f"https://mindactions.app/reset-password?token={reset_token}"
    reset_url = f"http://localhost:5173/reset-password?email={email}&token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }}
            .container {{ max-width: 480px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }}
            .logo {{ font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px; }}
            .logo span {{ color: #4f46e5; }}
            h1 {{ font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 12px; text-align: center; }}
            p {{ color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: center; }}
            .btn-container {{ text-align: center; margin: 32px 0; }}
            .btn {{ background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 32px; font-weight: 600; border-radius: 6px; display: inline-block; font-size: 15px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }}
            .footer {{ font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 24px; }}
            .fallback-link {{ font-size: 11px; word-break: break-all; color: #9ca3af; margin-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Mind<span>Actions</span></div>
            <h1>Reset your password</h1>
            <p>We received a request to reset your password. Click the button below to choose a new, secure password:</p>
            <div class="btn-container">
                <a href="{reset_url}" class="btn">Reset Password</a>
            </div>
            <p style="font-size: 13px;">For security, this link is single-use and will automatically expire in 1 hour.</p>
            <div class="fallback-link">
                If the button isn't working, copy and paste this URL into your browser:<br>
                <a href="{reset_url}" style="color: #4f46e5;">{reset_url}</a>
            </div>
            <div class="footer">
                &copy; 2026 MindActions. Securely managed. <br>
                If you didn't request a password reset, you can safely ignore this email.
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params: resend.Emails.SendParams = {
            "from": SENDER_IDENTITY,
            "to": [email],
            "subject": "Reset your MindActions Password",
            "html": html_content,
        }
        await resend.Emails.send_async(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reset email: {str(e)}")