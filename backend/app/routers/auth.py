import datetime
from fastapi import APIRouter, HTTPException, Response, status, Depends
from app.config import settings
from app.models import UserRegister, UserLogin, ForgotPassword, ResetPassword, VerifyEmail
from app.database import db_manager
from app.auth import (
    hash_password, verify_password, create_access_token, get_current_user, public_user,
    set_session_cookie, clear_session_cookie, create_purpose_token, user_from_purpose_token,
)
from app.services.email_service import send_email, render_html

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

RESET_MINUTES = 30
VERIFY_MINUTES = 60 * 24 * 3


async def _send_verification_email(user: dict) -> str:
    token = create_purpose_token("verify_email", user, VERIFY_MINUTES)
    link = f"{settings.PUBLIC_URL}/auth/verify?token={token}"
    await send_email(
        user["email"],
        "Confirm your email for Serenova",
        f"Hi {user['name'].split(' ')[0]},\n\nPlease confirm your email address:\n{link}\n\nThe link works for 3 days.",
        render_html(
            "Confirm your email",
            f"<p>Hi {user['name'].split(' ')[0]}, please confirm your email address so we can reach you about appointments and password resets.</p>",
            "Confirm email", link,
        ),
    )
    return link


def _session_response(user: dict, response: Response) -> dict:
    token = create_access_token({"sub": str(user["_id"]), "email": user["email"]})
    set_session_cookie(response, token)
    # The token is also returned for API clients and tests. The website itself never stores it:
    # it relies on the httpOnly cookie, which page scripts cannot read.
    return {"access_token": token, "token_type": "bearer", "user": public_user(user)}


@router.post("/register")
async def register(payload: UserRegister, response: Response):
    users_col = db_manager.get_collection("users")
    email = payload.email.lower().strip()

    if await users_col.find_one({"email": email}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_user = {
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "student",
        "email_verified": False,
        "created_at": now_iso,
        "updated_at": now_iso,
        "profile": {
            "university": payload.university or "",
            "year_of_study": payload.year_of_study or "",
            "avatar_color": "#C65D3A",
            "daily_reminder": False,
            "language": "en",
        },
    }
    res = await users_col.insert_one(new_user)
    new_user["_id"] = str(res.inserted_id)

    link = await _send_verification_email(new_user)
    body = _session_response(new_user, response)
    if settings.DEMO_MODE and not settings.EMAIL_ENABLED:
        body["dev_verify_link"] = link  # lets you test without a mail server; never sent in production
    return body


@router.post("/login")
async def login(payload: UserLogin, response: Response):
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"email": payload.email.lower().strip()})

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _session_response(user, response)


@router.post("/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPassword):
    """Always answers the same way, so nobody can use this to discover which emails have accounts."""
    generic = {"message": "If an account exists for that email, a reset link is on its way."}
    user = await db_manager.get_collection("users").find_one({"email": payload.email.lower().strip()})
    if not user:
        return generic

    token = create_purpose_token("reset_password", user, RESET_MINUTES)
    link = f"{settings.PUBLIC_URL}/auth/reset?token={token}"
    await send_email(
        user["email"],
        "Reset your Serenova password",
        f"Hi {user['name'].split(' ')[0]},\n\nUse this link to choose a new password (valid for {RESET_MINUTES} minutes):\n{link}\n\n"
        "If you didn't ask for this, you can ignore this email; your password has not changed.",
        render_html(
            "Reset your password",
            f"<p>Use the button below to choose a new password. It works for {RESET_MINUTES} minutes. "
            "If you didn't ask for this, ignore this email; nothing has changed.</p>",
            "Choose a new password", link,
        ),
    )
    if settings.DEMO_MODE and not settings.EMAIL_ENABLED:
        generic["dev_reset_link"] = link
    return generic


@router.post("/reset-password")
async def reset_password(payload: ResetPassword):
    user = await user_from_purpose_token(payload.token, "reset_password")
    await db_manager.get_collection("users").update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": hash_password(payload.new_password),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }},
    )
    return {"message": "Your password has been changed. You can sign in now."}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmail):
    user = await user_from_purpose_token(payload.token, "verify_email")
    await db_manager.get_collection("users").update_one(
        {"_id": user["_id"]}, {"$set": {"email_verified": True}}
    )
    return {"message": "Your email is confirmed. Thank you!"}


@router.post("/resend-verification")
async def resend_verification(current_user: dict = Depends(get_current_user)):
    if current_user.get("email_verified"):
        return {"message": "Your email is already confirmed."}
    full = await db_manager.get_collection("users").find_one({"_id": current_user["_id"]})
    link = await _send_verification_email(full)
    body = {"message": "We've sent you a new confirmation link."}
    if settings.DEMO_MODE and not settings.EMAIL_ENABLED:
        body["dev_verify_link"] = link
    return body
