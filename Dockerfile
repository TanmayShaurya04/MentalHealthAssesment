# ==============================================================================
# Production Dockerfile for Serenova
# Multi-stage build: Builds modern Vite SPA & runs FastAPI backend unified
# ==============================================================================

# ── Stage 1: Build Frontend SPA ────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Copy dependency definitions and install cleanly with glibc compatibility
COPY frontend/package*.json ./
RUN npm install --no-audit

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

# Install minimal system utilities (curl for health check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code & default seed data
COPY backend/ ./

# Copy built frontend assets from stage 1 into dist/
COPY --from=frontend-builder /build/dist ./dist

# Expose default port
EXPOSE 8000

# Health check using IPv4 loopback to prevent dual-stack resolution failures
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-8000}/api/health || exit 1

# Start FastAPI server using uvicorn via python module
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
