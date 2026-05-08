FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml ./
COPY uv.lock* ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project

COPY alembic.ini ./
COPY alembic ./alembic
COPY src ./src

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
