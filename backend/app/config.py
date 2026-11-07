import os
from typing import List
from dotenv import load_dotenv

# Automatically load environment variables from .env file
load_dotenv()

DEFAULT_DEV_SECRET = "serenova-dev-super-secure-secret-key-32chars"


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    def __init__(self):
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.IS_PRODUCTION: bool = self.ENVIRONMENT.lower() == "production"

        # ── Browser access ────────────────────────────────────────
        # Set CORS_ORIGINS to your real site URL(s) in production (comma separated).
        self.CORS_ORIGINS: List[str] = [
            origin.strip() for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
            ).split(",") if origin.strip()
        ]
        self.PUBLIC_URL: str = os.getenv("PUBLIC_URL", "http://localhost:8000").rstrip("/")

        # ── Auth ──────────────────────────────────────────────────
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", DEFAULT_DEV_SECRET)
        self.JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
        self.COOKIE_NAME: str = os.getenv("COOKIE_NAME", "serenova_session")
        # Secure cookies need HTTPS. Use COOKIE_SAMESITE=none only if the frontend is on a different domain.
        self.COOKIE_SECURE: bool = _bool("COOKIE_SECURE", self.IS_PRODUCTION)
        self.COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax").lower()

        # ── Demo mode: shows demo logins and seeds demo accounts. Turn OFF in production. ──
        self.DEMO_MODE: bool = _bool("DEMO_MODE", not self.IS_PRODUCTION)
        self.DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "password123")

        # ── Database ──────────────────────────────────────────────
        self.MONGODB_URL: str = os.getenv("MONGODB_URL", "")
        self.DATABASE_NAME: str = os.getenv("DATABASE_NAME", "serenova")

        # ── AI (LLM-compatible API, default Groq) ─────────────────
        self.AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")
        self.AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
        self.AI_MODEL: str = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")
        self.AI_API_KEY: str = os.getenv("AI_API_KEY", "")

        # ── Email (optional). Without SMTP_HOST, emails are printed to the server console. ──
        self.SMTP_HOST: str = os.getenv("SMTP_HOST", "")
        self.SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
        self.SMTP_USER: str = os.getenv("SMTP_USER", "")
        self.SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
        self.SMTP_FROM: str = os.getenv("SMTP_FROM", "Serenova <no-reply@serenova.local>")
        self.SMTP_STARTTLS: bool = _bool("SMTP_STARTTLS", True)
        self.EMAIL_ENABLED: bool = bool(self.SMTP_HOST)

        # ── Reminders ─────────────────────────────────────────────
        self.REMINDERS_ENABLED: bool = _bool("REMINDERS_ENABLED", True)
        self.DAILY_REMINDER_HOUR_UTC: int = int(os.getenv("DAILY_REMINDER_HOUR_UTC", "12"))  # 17:30 IST

        # ── Abuse protection ──────────────────────────────────────
        self.RATE_LIMIT_ENABLED: bool = _bool("RATE_LIMIT_ENABLED", True)

        # ── Admin analytics: hide groups smaller than this so no individual can be singled out ──
        self.MIN_GROUP_SIZE: int = int(os.getenv("MIN_GROUP_SIZE", "0" if self.DEMO_MODE else "5"))

        # ── Error reporting (optional) ────────────────────────────
        self.SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

    def validate(self) -> None:
        """Refuse to start in production with unsafe defaults."""
        if self.IS_PRODUCTION:
            if self.JWT_SECRET == DEFAULT_DEV_SECRET or len(self.JWT_SECRET) < 32:
                raise RuntimeError("JWT_SECRET must be set to a random value of at least 32 characters in production.")
            if "*" in self.CORS_ORIGINS:
                raise RuntimeError("CORS_ORIGINS must list your real site URL(s) in production, not '*'.")
            if self.COOKIE_SAMESITE == "none" and not self.COOKIE_SECURE:
                raise RuntimeError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true.")


settings = Settings()
