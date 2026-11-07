from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api", tags=["Config"])


@router.get("/config")
async def public_config():
    """Non-secret settings the website needs (e.g. whether to show the demo-login helper)."""
    return {
        "demo_mode": settings.DEMO_MODE,
        "demo_password": settings.DEMO_PASSWORD if settings.DEMO_MODE else None,
        "email_enabled": settings.EMAIL_ENABLED,
        "sentry_dsn": settings.SENTRY_DSN or None,
    }
