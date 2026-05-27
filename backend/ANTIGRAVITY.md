# Antigravity AI Agent - Backend Developer Guide

This file provides system instructions, operational workflows, and planning mode guidelines for **Antigravity** developer agents when operating in the backend directory.

---

## 🤖 1. Operating Instructions & Constraints

* **Strict Architecture decoupling**: Respect the layers separating Database Repositories, Business Services, and Web API Routers. Keep SQL operations away from Routers and HTTP operations away from Services.
* **Planning Mode rules**: Adhere to planning workflows inside `brain/<conversation-id>`. Generate the `implementation_plan.md` first and obtain explicit user approval before modifying workspace source files.
* **Async Operations**: All I/O bound database and external requests must run asynchronously. Heavy CPU tasks (e.g. video rendering) must execute inside thread pools via `asyncio.to_thread`.

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

## 🗺️ 3. Master Documentation Index

Refer to these single-topic manuals under `../docs/` for granular designs:
* **SQL Models & Relationships**: [docs/database.md](../docs/database.md)
* **SQLAlchemy & Layer Decoupling**: [docs/backend-architecture.md](../docs/backend-architecture.md)
* **API Routers & Schemas**: [docs/api.md](../docs/api.md)
* **pgvector RAG Pipelines**: [docs/backend-rag.md](../docs/backend-rag.md)
* **Remotion Video synthesis**: [docs/backend-video.md](../docs/backend-video.md)
* **Arq Queue & Migration commands**: [docs/workflows.md](../docs/workflows.md)

---

## 🔨 4. CLI Execution Reference

* Sync Python Environment: `uv sync`
* Database Migration: `uv run alembic upgrade head`
* Create Alembic Migrations: `uv run alembic revision --autogenerate -m "revision_desc"`
* Start FastAPI Web Server: `uv run uvicorn src.main:app --reload`
* Start Arq Worker Daemon: `uv run arq src.workers.arq_worker.WorkerSettings`
* Execute Test Suites: `uv run pytest`
* Run Static Linter: `uv run ruff check .`
