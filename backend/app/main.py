import os
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import db_manager
from app.seed_data import seed_database_if_empty

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
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect DB and seed initial data
    await db_manager.connect()
    await seed_database_if_empty()
    yield
    # Shutdown
    if db_manager.client:
        db_manager.client.close()

app = FastAPI(
    title="Serenova API",
    description="Digital Mental Health and Psychological Support System for Students",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development & production Vercel SPA
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Error] Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

# ── Serve Built Frontend SPA in Production ───────────────────────
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(frontend_dist):
    # Check alternate location for containerized deployments (backend/dist or ./dist)
    alt_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
    if os.path.exists(alt_dist):
        frontend_dist = alt_dist

if os.path.exists(frontend_dist):
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
        return FileResponse(os.path.join(frontend_dist, "index.html"))
