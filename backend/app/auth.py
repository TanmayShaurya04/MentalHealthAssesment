import datetime
import bcrypt
import jwt
from typing import Optional, Dict, Any, Iterable
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import db_manager

security = HTTPBearer(auto_error=False)

ROLE_STUDENT = "student"
ROLE_COUNSELLOR = "counsellor"
ROLE_ADMIN = "admin"


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        return None


# ── Purpose-bound, short-lived tokens for emailed links (reset / verify) ─────────
def create_purpose_token(purpose: str, user: Dict[str, Any], minutes: int) -> str:
    """The password-hash fragment makes a reset link single-use: once the password changes, the token stops working."""
    return create_access_token(
        {"sub": str(user["_id"]), "purpose": purpose, "pw": (user.get("password_hash") or "")[-12:]},
        expires_delta=datetime.timedelta(minutes=minutes),
    )


async def user_from_purpose_token(token: str, purpose: str) -> Dict[str, Any]:
    payload = decode_access_token(token)
    if not payload or payload.get("purpose") != purpose:
        raise HTTPException(status_code=400, detail="This link is invalid or has expired. Please request a new one.")
    user = await db_manager.get_collection("users").find_one({"_id": payload.get("sub")})
    if not user or (user.get("password_hash") or "")[-12:] != payload.get("pw"):
        raise HTTPException(status_code=400, detail="This link is invalid or has expired. Please request a new one.")
    return user


# ── Session cookie (httpOnly: JavaScript on the page can never read it) ──────────
def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=settings.COOKIE_NAME, path="/", samesite=settings.COOKIE_SAMESITE, secure=settings.COOKIE_SECURE)


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """The user fields that are safe to send to the browser."""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", ROLE_STUDENT),
        "email_verified": bool(user.get("email_verified", False)),
        "counsellor_id": user.get("counsellor_id"),
        "consent": user.get("consent"),
        "created_at": user.get("created_at", ""),
        "profile": user.get("profile", {}),
    }


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    # An explicit Authorization header (API clients, tests) wins over the browser's cookie.
    token = (credentials.credentials if credentials else None) or request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload or payload.get("purpose"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db_manager.get_collection("users").find_one({"_id": payload["sub"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.pop("password_hash", None)
    user.setdefault("role", ROLE_STUDENT)
    return user


def require_roles(*roles: str):
    """Dependency factory: only let users with one of the given roles through."""
    allowed: Iterable[str] = roles

    async def checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user.get("role", ROLE_STUDENT) not in allowed:
            raise HTTPException(status_code=403, detail="You do not have access to this area.")
        return current_user

    return checker
