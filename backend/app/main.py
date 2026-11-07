import os
import asyncio
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import db_manager
from app.seed_data import seed_database_if_empty, ensure_demo_data
from app.services.rate_limit import RateLimitMiddleware
from app.services.reminders import reminder_loop

from app.routers import (
    auth,
    users,
    moods,
    journals,
    assessments,
    counsellors,
    appointments,
    chat,
    resources,
    counsellor_portal,
    admin,
    app_config,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect DB and seed initial data
    settings.validate()
    await db_manager.connect()
    await seed_database_if_empty()
    await ensure_demo_data()
    reminder_task = asyncio.create_task(reminder_loop()) if settings.REMINDERS_ENABLED else None
    yield
    # Shutdown
    if reminder_task:
        reminder_task.cancel()
    if db_manager.client:
        db_manager.client.close()

if settings.SENTRY_DSN:
    try:  # optional: `pip install sentry-sdk` and set SENTRY_DSN to enable
        import sentry_sdk
        sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT, send_default_pii=False)
    except ImportError:
        print("[Sentry] SENTRY_DSN is set but sentry-sdk is not installed.")

app = FastAPI(
    title="Serenova API",
    description="Digital Mental Health and Psychological Support System for Students",
    version="1.0.0",
    lifespan=lifespan
)

# CORS: only the origins you list (see CORS_ORIGINS). Cookies need explicit origins, never "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data: https://images.unsplash.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
            "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        )
    return response


# Health Check
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "serenova-api",
        "storage_mode": "mongodb" if db_manager.is_mongo else "file_backed",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ai_provider": settings.AI_PROVIDER,
        "ai_model": settings.AI_MODEL,
    }

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(moods.router)
app.include_router(journals.router)
app.include_router(assessments.router)
app.include_router(counsellors.router)
app.include_router(appointments.router)
app.include_router(chat.router)
app.include_router(resources.router)
app.include_router(counsellor_portal.router)
app.include_router(admin.router)
app.include_router(app_config.router)

@app.post("/api/client-errors", status_code=204, tags=["Health"])
async def client_errors(request: Request):
    """Receives crashes from the browser so they show up in the server log. Message and page only; nothing personal."""
    try:
        body = await request.json()
        print(f"[ClientError] {str(body.get('page'))[:120]} :: {str(body.get('message'))[:300]}")
    except Exception:  # noqa: BLE001
        pass


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Error] Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

# ── Serve Built Frontend SPA in Production ───────────────────────
frontend_dist = os.getenv("FRONTEND_DIST")
if not frontend_dist or not os.path.exists(frontend_dist):
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
        os.path.abspath(os.path.join(os.getcwd(), "dist")),
        "/app/dist",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            frontend_dist = candidate
            break

if frontend_dist and os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_spa(full_path: str):
        # Do not intercept API or docs routes
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # The SPA shows its own friendly 404 page for unknown routes, so serve index.html for any page path.
        return FileResponse(os.path.join(frontend_dist, "index.html"))
