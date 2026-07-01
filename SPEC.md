# Artha — Spec

## §G — Goal

Local-only RAG engine + AI agent platform for regulated enterprises.
Single `docker compose up` deploys full stack. Zero data egress.

## §C — Constraints

| id  | constraint                                         |
| --- | -------------------------------------------------- |
| C1  | ! zero external API deps (no OpenAI, no cloud)     |
| C2  | ! PostgreSQL + pgvector + pg_trgm for storage      |
| C3  | ! Ollama for inference & embedding (local)         |
| C4  | ! LangGraph state machine for agent pipelines      |
| C5  | ! ARQ + Redis for background ingestion             |
| C6  | ! FastAPI + asyncpg + structlog + ruff             |
| C7  | ? deploy target: Docker Compose (not k8s yet)      |
| C8  | ! Async everywhere — no sync DB/Redis calls        |

## §I — Interface Surfaces

### REST API (app/routes/)

| prefix              | file              | key operations                       |
| ------------------- | ----------------- | ------------------------------------ |
| `GET /health`       | `health.py`       | health check                         |
| `POST /api/auth/…`  | `auth.py`         | login, register, refresh, me         |
| `GET /api/projects` | `projects.py`     | projects CRUD                        |
| `POST /api/documents` | `documents.py`  | upload, ingest, list, delete         |
| `GET /api/conversations` | `conversations.py` | conversations CRUD              |
| `POST /api/chat`    | `chat.py`         | streaming chat (SSE) + feedback      |
| `GET /api/analytics` | `analytics.py`   | usage stats                          |
| `POST /api/extract`  | `extract.py`     | structured extraction from docs      |
| `GET /api/llm-config` | `llm_config.py` | LLM provider config CRUD            |
| `GET /api/agents`   | `agents.py`       | agent runtime endpoints              |
| `GET /api/workspaces/me` | `platform.py` | workspace info (merged from workspaces.py) |

### LangGraph Pipelines

| pipeline   | file                          | topology                                    |
| ---------- | ----------------------------- | ------------------------------------------- |
| RAG        | `app/services/agents/rag.py`  | analyze → retrieve(RRF) → rerank → gate → … |
| Ingestion  | `app/services/agents/ingestion.py` | parse → metadata → caption → chunk → embed → save |

### Background Workers (ARQ)

| worker           | file                               | function                       |
| ---------------- | ---------------------------------- | ------------------------------ |
| document ingest  | `app/services/arq_worker.py`       | `ingest_document`              |
| memory indexing  | `app/services/memory_worker.py`    | offline memory mgmt            |

### Infrastructure

| service    | role                        | port |
| ---------- | --------------------------- | ---- |
| Postgres   | main DB + vectors           | 5432 |
| Redis      | job queue + cache           | 6379 |
| Ollama     | LLM + embeddings            | 11434 |
| Langfuse   | observability               | 3001 |
| API        | FastAPI server              | 8000 |
| nginx      | gateway (Docker)            | 8080 |

### Auth

- JWT token (python-jose, RS256? HS256)
- Argon2 password hashing
- Rate limit (SlowAPI)
- SSRF guard

### Key Libraries

`fastapi`, `pydantic`, `sqlalchemy+asyncpg`, `alembic`, `pgvector`, `redis`, `arq`, `langgraph`, `langfuse`, `ollama`, `httpx`, `structlog`, `sentence-transformers`, `markitdown`, `instructor`, `litellm`, `slowapi`, `pymupdf`, `surya-ocr`

## §V — Invariants

| id   | invariant                                                   |
| ---- | ----------------------------------------------------------- |
| V1   | ∀ API handler → auth check before business logic            |
| V2   | ∀ async — no blocking DB/Redis calls in event loop          |
| V3   | ∀ secret — env var or .env, never in code                   |
| V4   | ∀ route prefix — starts with `/api/` (except health)        |
| V5   | ∀ DB write → repository layer, never in route handler       |
| V6   | ∀ response streaming → SSE, never websocket                 |
| V7   | ruff lint pass (E,F,I,B,UP,N) before merge                  |
| V8   | ∀ external HTTP → SSRF-guarded                              |

## §T — Tasks

| id   | status | task                                       | cites     |
| ---- | ------ | ------------------------------------------ | --------- |
| T1   | .      | full import test — `from app.main import app` | V2      |
| T2   | .      | ruff check on all app/ files               | V7        |
| T3   | .      | delete `_migrate.py`                       |           |
| T4   | .      | regenerate `requirements.txt` on deps change |           |
| T5   | .      | clean stale `app/models/schemas/__init__.py` |           |
| T6   | .      | add test for workspace merge (unused route removed) | V5 |
| T7   | .      | frontend — remove dead video feature refs   |           |
| T8   | .      | Docker Compose — verify `app.main:app` works live | V2 |

Status: `x` done, `~` wip, `.` todo.

## §B — Bug Log

| id | date | cause | fix |
| -- | ---- | ----- | --- |
