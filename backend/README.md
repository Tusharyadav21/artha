# Backend (FastAPI + LangGraph + Arq)

Backend API and worker for Agentic RAG.

## What Runs Here
- FastAPI API server (`src.main:app`)
- Arq background worker (`src.workers.arq_worker.WorkerSettings`)
- Alembic migrations (`alembic/`)

## Environment

Backend reads config from environment variables (or `.env` in repo root):
- `DATABASE_URL`
- `REDIS_URL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL_REASONER`
- `OLLAMA_MODEL_PLANNER`
- `OLLAMA_MODEL_EMBED`
- `OLLAMA_NUM_CTX`
- `OLLAMA_NUM_PREDICT`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `LOG_LEVEL`
- `CORS_ALLOW_ORIGINS`
- `CORS_ALLOW_ORIGIN_REGEX`

Reference values are in [.env.example](/Users/suven/Desktop/repo/agentic_rag/.env.example).

## Run with Docker Compose

From repo root:
```bash
docker compose up --build backend worker
```

Run migrations:
```bash
docker compose exec backend alembic upgrade head
```

API health endpoint:
```bash
curl http://localhost:8000/health
```

## Run Locally (No Compose)

## Prerequisites
- Python `>=3.12`
- `uv`
- PostgreSQL with `pgvector` enabled
- Redis
- Ollama with required models pulled

## Setup
```bash
cd backend
uv sync
```

Apply migrations:
```bash
uv run alembic upgrade head
```

Start API:
```bash
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Start worker in another terminal:
```bash
cd backend
uv run arq src.workers.arq_worker.WorkerSettings
```

## Development Commands

Lint:
```bash
uv run ruff check .
```

Tests:
```bash
uv run pytest
```

## Migrations

Create new migration:
```bash
uv run alembic revision -m "your_message"
```

Upgrade:
```bash
uv run alembic upgrade head
```

Downgrade one step:
```bash
uv run alembic downgrade -1
```

## Notes
- Document ingestion is async via Redis/Arq. If uploads remain `pending`, check worker logs first.
- Chat responses stream from Ollama. Ensure `OLLAMA_BASE_URL` is reachable from where API runs.
