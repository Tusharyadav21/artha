# Claude Code - Backend Developer Guide

This file provides system instructions, command references, and architecture standards for **Claude Code** (claude.ai/code) when operating in the backend directory.

---

## 🤖 1. Operating & Coding Directives

* **Layer Isolation**: All backend code must adhere strictly to the decoupling of Routers, Services, and Repositories. Do not write SQL or execute ORM calls inside API endpoints.
* **Strict typing**: Python 3.13 strict types are required on all function arguments and returns. Avoid `Any`.
* **Async by Default**: Use `async def` and `await` for all DB connections, Redis pools, and Ollama clients.

---

## 📂 2. Directory Layout

```text
backend/
├── src/
│   ├── api/          # FastAPI routers & request dependencies
│   ├── core/         # DB engine & global settings config
│   ├── domain/       # SQLAlchemy tables definitions
│   ├── schemas/      # Pydantic validation schemas
│   ├── services/     # Business logic layer
│   ├── repositories/ # Database operations layer
│   └── workers/      # Arq async background jobs worker
└── tests/            # Async test fixtures
```

---

## 🗺️ 3. Modular Master Documentation Index

Refer to these focused manuals under `../docs/` for granular backend architectures:
* **Database Models**: [docs/database.md](../docs/database.md)
* **SQLAlchemy & Layer Decoupling**: [docs/backend-architecture.md](../docs/backend-architecture.md)
* **API Routers & Schemas**: [docs/api.md](../docs/api.md)
* **pgvector RAG Pipelines**: [docs/backend-rag.md](../docs/backend-rag.md)
* **Remotion Video synthesis**: [docs/backend-video.md](../docs/backend-video.md)
* **Arq Queue & Migration commands**: [docs/workflows.md](../docs/workflows.md)

---

## 🔨 4. Quick Command Reference

* Sync Python Environment: `uv sync`
* Apply Alembic Migrations: `uv run alembic upgrade head`
* Create Alembic Migrations: `uv run alembic revision --autogenerate -m "revision_desc"`
* Run FastAPI API Server: `uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`
* Run Arq worker: `uv run arq src.workers.arq_worker.WorkerSettings`
* Lint Checks: `uv run ruff check .`
* Run tests: `uv run pytest`
