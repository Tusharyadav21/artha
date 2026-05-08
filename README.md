# Agentic RAG

Local-first Agentic RAG stack:
- Backend: FastAPI + LangGraph + Ollama + PostgreSQL/pgvector + Redis/Arq
- Frontend: Next.js + Bun + Shadcn-style UI

## Quick Start (Docker Compose)

### 1. Prepare env file
```bash
cp .env.example .env
```

### 2. Ensure Ollama is running locally
Install Ollama on your host machine (https://ollama.com) and start it:
```bash
ollama serve &
```
Pull the required models:
```bash
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```
The backend and worker will connect to Ollama at `http://host.docker.internal:11434`.

### 3. Start everything via Docker Compose
```bash
docker compose up --build
```

### 4. Apply DB migrations (first run and after schema changes)
```bash
docker compose exec backend alembic upgrade head
```

### 5. Stop
```bash
docker compose down
```
To also remove volumes:
```bash
docker compose down -v
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Langfuse: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Ollama (host): `http://localhost:11434`

## Run Without Docker Compose

Use this path when you want to run services directly on your machine.

## Prerequisites
- Python `>=3.12`
- `uv`
- Bun `>=1.0`
- Node `>=20.9` (required by Next.js build tooling)
- PostgreSQL `16+` with `pgvector`
- Redis `7+`
- Ollama (installed locally)

## 1. Start infrastructure

### PostgreSQL
Create database/user matching `.env.example` defaults (or set your own env values):
- DB: `ragapp`
- User: `ragapp`
- Password: `ragapp`

Enable pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis
Run Redis on `redis://localhost:6379/0`.

### Ollama
Start Ollama and pull models (see step 2 above).

## 2. Configure environment
```bash
cp .env.example .env
```

Load env vars in your shell:
```bash
set -a
source .env
set +a
```

## 3. Start backend API
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## 4. Start worker (new terminal)
```bash
cd backend
uv sync
uv run arq src.workers.arq_worker.WorkerSettings
```

## 5. Start frontend (new terminal)
```bash
cd frontend
bun install
bun run dev
```

Open `http://localhost:3000`.

## Development Checks

### Backend
```bash
cd backend
uv run ruff check .
uv run pytest
```

### Frontend
```bash
cd frontend
bun run typecheck
bun run lint
bun run build
```

## Project Readmes
- Backend details: [backend/README.md](/Users/suven/Desktop/repo/agentic_rag/backend/README.md)
- Frontend details: [frontend/README.md](/Users/suven/Desktop/repo/agentic_rag/frontend/README.md)
