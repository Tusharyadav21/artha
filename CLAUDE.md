# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

**Agentic RAG** is a local-first RAG system combining LangGraph orchestration with Ollama for local inference. The architecture separates concerns across three layers:

### God Nodes (Core Abstractions)
These are the highest-traffic components connecting multiple systems:
- **Service layer** (orchestrates domain logic; no HTTP, no direct ORM) — bridges repositories, auth, and agents
- **DocumentRepository** — 21 edges; handles pgvector semantic search, hierarchical chunking, and parent-child chunk relationships
- **ProjectRepository** — 18 edges; manages project scoping and document isolation per user
- **ConversationRepository** — 16 edges; tracks chat history and message metadata
- **OllamaClient** — 16 edges; abstracts LLM/embedding API calls with streaming and batching

### Core Communities
1. **Auth & User Management** (Community 3): JWT tokens, PBKDF2 hashing, session lifecycle, `get_current_user()` dependency injection
2. **Document Ingestion** (Community 2): `process_document()` worker, hierarchical chunking (child ~60 words, parent context), embedding via Ollama, async Arq background jobs
3. **Chat & RAG Pipeline** (Community 0): LangGraph agent, hybrid RRF search (vector + trigram keyword), source citation, streaming SSE responses
4. **Data Models** (Community 1): Pydantic schemas (UserCreate, ChatRequest, ConversationRead), type safety at API boundaries
5. **Frontend Integration** (Community 15): `apiFetch()`, `apiUrl()`, error handling, token persistence in localStorage

### Technology Stack
| Layer | Tech | Key Files |
| --- | --- | --- |
| **Frontend** | Next.js 16, Bun, Tailwind, Shadcn UI, TypeScript | `frontend/src/`, `frontend/app/` |
| **Backend** | FastAPI, SQLAlchemy async ORM, Pydantic | `backend/src/main.py`, `backend/src/routers/` |
| **Agents** | LangGraph, Ollama (qwen2.5:3b, nomic-embed-text) | `backend/src/agents/rag.py` |
| **Ingestion** | Arq workers, PDF/DOCX/TXT parsing, pgvector | `backend/src/workers/arq_worker.py` |
| **Database** | PostgreSQL 16 + pgvector + pg_trgm extensions | Alembic migrations in `backend/alembic/` |
| **Cache & Queue** | Redis 7+, Arq job queue | Background job delivery |

---

## Development Setup

### Prerequisites
- **Python 3.12+** with `uv` (backend)
- **Bun 1.0+** (frontend)
- **PostgreSQL 16+** with `pgvector` and `pg_trgm` extensions
- **Redis 7+**
- **Ollama** running locally with pulled models

### PostgreSQL Extensions (Required)
Before running migrations, ensure extensions exist:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Docker Compose handles this automatically. For local dev, run the above in your PostgreSQL database.

### Backend Setup & Commands

```bash
cd backend
uv sync                              # Install dependencies
uv run alembic upgrade head          # Run migrations
uv run uvicorn src.main:app --reload # Start API (http://localhost:8000)
uv run arq src.workers.arq_worker.WorkerSettings  # Start worker (separate terminal)
```

**Quality Control:**
```bash
uv run ruff check .                  # Lint
uv run pytest                        # All tests
uv run pytest tests/test_auth_api.py # Single test file
uv run pytest tests/ -k "test_login" # Single test
```

**Key Environment Variables** (in `.env`):
- `DATABASE_URL`: PostgreSQL async connection
- `REDIS_URL`: Redis connection (for Arq)
- `OLLAMA_BASE_URL`: `http://localhost:11434` (local Ollama)
- `OLLAMA_MODEL_PLANNER`: `qwen2.5:3b` (planning/reasoning model)
- `OLLAMA_MODEL_EMBED`: `nomic-embed-text` (768-dim embeddings)

### Frontend Setup & Commands

```bash
cd frontend
bun install                          # Install dependencies
bun run dev                          # Start dev server (http://localhost:3000)
bun run build                        # Production build
bun run start                        # Serve production build
```

**Quality Control:**
```bash
bun run typecheck                    # TypeScript type checking
bun run lint                         # ESLint
bun run check                        # Full suite (type, lint, build)
```

**Key Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Backend endpoint (default: `http://localhost:8000`)

---

## Key Architectural Patterns

### 1. Repository Pattern (Data Access Layer)
All database queries go through repositories in `backend/src/repositories/`. Never use ORM directly in routers.

**Pattern:**
```python
# Instead of: session.query(Document).filter(...).all()
# Use:
repo = DocumentRepository(session)
await repo.search_chunks(project_id, embedding, limit=6)
```

**Key Repositories:**
- `UserRepository`: User CRUD, lookup by email
- `ProjectRepository`: Project scoping to user, `get_for_user()`
- `DocumentRepository`: pgvector cosine search, hierarchical chunk relationships
- `ConversationRepository`: Message history, conversation metadata

### 2. Hybrid Search with Reciprocal Rank Fusion (RRF)
Documents are searchable via:
- **Vector search**: pgvector cosine distance on `nomic-embed-text` embeddings (768 dims)
- **Keyword search**: PostgreSQL trigram (pg_trgm) full-text index for typo-tolerant matching
- **RRF**: Combines top-k results from both, weights by reciprocal rank

See `backend/src/repositories/documents.py:search_chunks()` for implementation.

### 3. Hierarchical Chunking
Documents are split into:
- **Child chunks** (~60 words, 40-word overlap): Embedded and stored in pgvector for retrieval
- **Parent chunks** (full context): Returned alongside child chunks for reranking quality

Parents are critical for disambiguation; always include in prompt context.

See `backend/src/services/ingestion.py:chunk_text_hierarchical()`.

### 4. LangGraph Agent Orchestration
The RAG agent in `backend/src/agents/rag.py` is a StatefulGraph with nodes:
- **retrieve**: Embed query, search chunks, apply parent context
- **compose_prompt**: Format retrieved chunks with citations `[1]..[N]`
- **classify_query_complexity**: Route simple vs. complex queries

Agents are invoked with `.ainvoke(state)` and stream tokens back via SSE.

### 5. Async Ingestion via Arq Workers
Document upload is fire-and-forget:
1. API stores metadata, enqueues background job, returns 202
2. Arq worker processes: parse → chunk → embed → vectorize → update status
3. Frontend polls `GET /documents` until status transitions to `completed` or `failed`

Worker is defined in `backend/src/workers/arq_worker.py:process_document()`.

### 6. Service Layer (No HTTP, No Direct ORM)
The service layer in `backend/src/services/` orchestrates business logic. It:
- Takes repositories and clients as dependencies
- Returns domain objects or Pydantic schemas
- Never handles HTTP or raw ORM queries

Example: `ingestion.parse_document_bytes()` is reused by both the API and worker.

### 7. SSE Streaming for Chat
Chat responses stream tokens in real-time via Server-Sent Events:
```
event: conversation
data: {"id":"...", "project_id":"..."}

event: sources
data: [{"doc_id":"...", "content":"..."}]

event: token
data: " streaming"

event: final
data: {"message_id":"...", "content":"..."}
```

See `backend/src/routers/chat.py:chat_endpoint()`.

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Create router** in `backend/src/routers/new_feature.py`:
   ```python
   from fastapi import APIRouter, Depends
   from backend.src.auth.dependencies import get_current_user
   
   router = APIRouter(prefix="/api/...", tags=["..."])
   
   @router.post("/...")
   async def my_endpoint(
       current_user: User = Depends(get_current_user),
       session: AsyncSession = Depends(get_db),
   ):
       repo = MyRepository(session)
       result = await repo.some_operation()
       return result
   ```

2. **Register in** `backend/src/main.py`:
   ```python
   app.include_router(new_feature.router)
   ```

3. **Add tests** in `backend/tests/test_new_feature.py`

### Adding a Database Migration

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
# Review the generated file in alembic/versions/
uv run alembic upgrade head
```

### Adding Frontend Components

1. Use Shadcn UI components from `frontend/src/components/ui/`
2. Create feature components in `frontend/src/components/`
3. Use hooks in `frontend/src/hooks/`
4. API calls via `frontend/src/lib/api.ts:apiFetch()`
5. Run `bun run typecheck` to catch TS errors early

### Running a Single Test

```bash
cd backend
uv run pytest tests/test_auth_api.py::test_login_returns_token -v
```

### Profiling Ollama Latency

RAG query latency is typically 5-15s:
- Embedding: ~500ms per query
- Reranking: ~500ms per 20 chunks
- LLM generation: ~3-10s depending on model and token count

Check timeouts in `backend/src/services/ollama.py`. If Ollama is slow, pull a smaller model or increase `OLLAMA_MODEL_PLANNER`.

---

## File Structure (High-Level)

```
backend/
├── src/
│   ├── main.py                 # FastAPI app, router registration, middleware
│   ├── auth/                   # JWT, PBKDF2, dependencies
│   ├── repositories/           # Data access layer (no HTTP)
│   ├── services/               # Business logic (no HTTP, no ORM)
│   ├── agents/                 # LangGraph orchestration
│   ├── domain/                 # SQLAlchemy models
│   ├── routers/                # FastAPI endpoints
│   ├── workers/                # Arq background jobs
│   └── core/                   # Config, database, constants
├── alembic/                    # Database migrations
├── tests/                      # Pytest suite (15+ tests)
└── README.md

frontend/
├── src/
│   ├── app/                    # Next.js App Router (auth, workspace, chat)
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks (useWorkspace, useChat)
│   ├── lib/                    # Utilities (api.ts, auth)
│   └── styles/                 # Tailwind, globals.css
├── public/                     # Static assets
└── README.md
```

---

## Debugging Tips

### Backend Issues

**Worker not processing jobs:**
```bash
# Check Redis connection
redis-cli ping
# Check Arq worker is running (separate terminal)
uv run arq src.workers.arq_worker.WorkerSettings
# Check database status
uv run python -c "from backend.src.core.database import check_database; check_database()"
```

**Ollama timeouts:**
- Ensure Ollama is running: `ollama serve`
- Verify models are pulled: `ollama list`
- Check latency: `time curl http://localhost:11434/api/embed -d '{"model":"nomic-embed-text"}'`

**Database migrations failed:**
```bash
# Check migration status
uv run alembic current
# Rollback to previous version
uv run alembic downgrade -1
# Re-apply
uv run alembic upgrade head
```

### Frontend Issues

**API call failing:**
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running on expected port
- Check browser console for CORS errors

**Type errors:**
```bash
bun run typecheck  # Full check
bun run lint       # Style issues
```

---

## Knowledge Graph

This project uses **graphify** for codebase analysis. The graph maps:
- 326 nodes (functions, classes, modules)
- 448 edges (dependencies, calls, uses)
- 56 communities (cohesive groups by coupling)

**To update the graph after code changes:**
```bash
graphify update .
```

**To query the graph:**
```bash
graphify query "How does RRF search work?"
graphify path "DocumentRepository" "OllamaClient"
graphify explain "hybrid search"
```

See `graphify-out/GRAPH_REPORT.md` for God Nodes, surprising connections, and architectural hotspots.

---

## Testing Strategy

- **Unit tests** for parsing (`test_ingestion.py`), chunking, auth (`test_auth_api.py`)
- **Integration tests** for API endpoints and database operations
- **Type checking** via Pydantic schemas and TypeScript
- **Frontend checks**: `bun run check` (type + lint + build)

All tests use async fixtures and a fake database (`conftest.py`). Run the full suite with `uv run pytest`.

---

## Before You Commit

1. **Backend**: `uv run ruff check . && uv run pytest`
2. **Frontend**: `bun run check`
3. Verify migrations run cleanly: `uv run alembic upgrade head`
4. If modifying code: `graphify update .` to keep the knowledge graph fresh
5. Ensure no sensitive data (API keys, tokens) is in code or `.env` commits

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
