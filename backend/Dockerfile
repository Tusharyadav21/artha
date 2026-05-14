FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Common environment variables
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app


# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only (cached layer)
FROM base AS deps
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --index-strategy unsafe-best-match

# Cache playwright browsers separately to avoid re-downloads
# This layer is only rebuilt if pyproject.toml/uv.lock changes
RUN --mount=type=cache,target=/root/.cache/ms-playwright \
    uv run playwright install chromium

# Development stage
FROM deps AS dev
COPY . .
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production builder stage
FROM deps AS builder
COPY . .

# Production runner stage
FROM base AS prod
# Copy the virtualenv from the deps stage
COPY --from=deps /app/.venv /app/.venv
# Copy application code
COPY alembic.ini ./
COPY alembic ./alembic
COPY src ./src
# Copy playwright browsers from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Pre-install video-renderer dependencies
COPY video-renderer/package*.json ./video-renderer/
RUN cd video-renderer && npm install
COPY video-renderer ./video-renderer

# Create a non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

