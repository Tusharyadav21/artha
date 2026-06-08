# ──────────────────────────────────────────────────────────
# Artha Backend — Production Container
# ──────────────────────────────────────────────────────────
# Multi-stage build to keep the final image lean.
# Stage 1: Install Python dependencies via uv.
# Stage 2: Copy runtime artifacts only.
# ──────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# System dependencies for building native extensions
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency manifest first for layer caching
COPY pyproject.toml uv.lock ./

# Install production dependencies (no dev extras)
RUN uv sync --frozen --no-dev --no-editable

# Copy application source
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .


# ── Stage 2: Runtime ──────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Runtime system dependencies (libpq for asyncpg, tesseract for OCR)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 tesseract-ocr && \
    rm -rf /var/lib/apt/lists/*

# Copy the virtual environment and app from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/alembic /app/alembic
COPY --from=builder /app/alembic.ini /app/alembic.ini

# Ensure the venv's Python is on the PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check using the readiness endpoint so dependency failures surface as unhealthy
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD ["python", "-c", "import json, sys, urllib.request; data = json.load(urllib.request.urlopen('http://localhost:8000/health/ready')); sys.exit(0 if data.get('status') == 'healthy' else 1)"]

# Run the FastAPI app via uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
