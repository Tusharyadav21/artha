<div align="center">
  <img src="../docs/assets/logo.png" width="80" alt="Artha Logo" />
  <h1>Artha - Backend</h1>
  <p><strong>FastAPI + LangGraph + Arq Background Processing</strong></p>
</div>

---

## 🚀 Overview

The backend is the engine of Artha. It provides a robust REST API, manages asynchronous document ingestion using **Arq**, and orchestrates autonomous agents using **LangGraph**.

## 🏗️ Components

- **FastAPI API**: High-performance RESTful API.
- **LangGraph Agent**: The "brain" that handles retrieval and reasoning.
- **Arq Worker**: Handles document parsing, chunking, and embedding.
- **Alembic**: Database migrations for PostgreSQL.
- **Ollama Client**: Interface for local LLM and embedding models.

## 🛠️ Environment Configuration

The backend reads configuration from environment variables. A template is provided in `.env.example` in the root directory.

| Variable               | Description                  | Default                    |
| :--------------------- | :--------------------------- | :------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL`            | Redis connection string      | `redis://localhost:6379/0` |
| `OLLAMA_BASE_URL`      | URL for Ollama API           | `http://localhost:11434`   |
| `OLLAMA_MODEL_PLANNER` | Model for planning/reasoning | `qwen2.5:3b`               |
| `OLLAMA_MODEL_EMBED`   | Model for vector embeddings  | `nomic-embed-text`         |

## 📦 Local Development

### Prerequisites

- Python `3.12+`
- [uv](https://github.com/astral-sh/uv) (fast Python package manager)
- PostgreSQL `16+` with `pgvector` and `pg_trgm` extensions
- Redis `7+`

### Database Setup

Before running migrations, ensure PostgreSQL extensions are created:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

The Docker setup automatically enables these. For local development, run the above SQL in your PostgreSQL database.

### Setup & Run

1. **Sync Dependencies**:

   ```bash
   uv sync
   ```

2. **Run Migrations**:

   ```bash
   uv run alembic upgrade head
   ```

3. **Start API Server**:

   ```bash
   uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Start Worker (in separate terminal)**:
   ```bash
   uv run arq src.workers.arq_worker.WorkerSettings
   ```

## 🧪 Quality Control

We maintain high code quality standards through automated testing and linting.

- **Linting**: `uv run ruff check .`
- **Testing**: `uv run pytest`

## 📝 Key Notes

- **Async Ingestion**: Document uploads are non-blocking. Status is tracked in the DB.
- **Streaming**: Responses are streamed via Server-Sent Events (SSE) for a snappy UX.
- **Observability**: Fully integrated with Langfuse for tracing agent runs.
- **Ollama Timeouts**: RAG queries depend on Ollama's response time. Expected latency:
  - Query rewriting: ~1-2s
  - Embedding: ~500ms per query
  - LLM generation (streaming): ~3-10s depending on model and context
  - Reranking: ~500ms per 20 chunks
  - **Total chat latency**: 5-15 seconds typical. Configure timeouts or retry behavior in `src/services/ollama.py`

---

<p align="center">Part of the <a href="../README.md">Artha</a> Stack</p>
