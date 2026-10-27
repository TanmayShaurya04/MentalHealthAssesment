# ==============================================================================
# Production Dockerfile for Serenova
# Multi-stage build: Builds modern Vite SPA & runs FastAPI backend unified
# ==============================================================================

# ── Stage 1: Build Frontend SPA ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Install dependencies first for efficient layer caching
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy frontend source and build optimized production bundle
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Python Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS production

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend assets from stage 1 into dist/
COPY --from=frontend-builder /build/dist ./dist

# Expose standard port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start FastAPI server using uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
