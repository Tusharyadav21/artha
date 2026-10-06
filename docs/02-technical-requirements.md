# 2. Technical Requirements Document

**Rule:** decided once, written down. Changing anything here needs an explicit decision, not a mid-build swap.

## 1. Constraints

| ID | Constraint |
|----|-----------|
| C1 | No external API dependency in default configuration (no OpenAI, no cloud). |
| C2 | Single-command deploy with Docker Compose (not Kubernetes yet). |
| C3 | Async everywhere on the API path — no blocking DB/Redis calls in the event loop. |
| C4 | Secrets only via environment variables, never in code. |
| C5 | Streaming is SSE, not WebSocket. |
| C6 | Every API handler authenticates before business logic; every DB write goes through the repository layer. |

## 2. Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, Framer Motion | Bun package manager; Vitest + Testing Library |
| API | FastAPI (Python 3.12), Pydantic v2, SQLAlchemy 2 async + asyncpg, Alembic | `uv` for deps; Dishka for DI; structlog |
| Relational DB | PostgreSQL (ParadeDB image) | Users, projects, documents, conversations, config |
| Vector DB | **Qdrant**, 1024-d cosine | Chunks and embeddings |
| Object storage | **MinIO** (S3-compatible) | Original uploaded files |
| Graph | **Neo4j 2025 community** | User memory / entities |
| Queue & cache | Redis 7 | Celery broker/result, embedding cache, event bus |
| Background jobs | **Celery** | Ingestion, memory extraction |
| Inference | **Ollama** via **LiteLLM** | Default `qwen2.5:7b`; embeddings `bge-m3` |
| Reranker | Cross-encoder (sentence-transformers, CPU torch) | Quality gate threshold 0.05 |
| Orchestration | LangGraph (+ Postgres checkpointer) | RAG and ingestion graphs |
| Parsing | MarkItDown, PyMuPDF, pdfplumber, Surya OCR | OCR fallback for scans |
| Observability | Langfuse v2 (own Postgres), structlog | Telemetry disabled |
| Gateway | nginx on :8080 | `/api/` → API, `/` → frontend |
| Lint/test | Ruff, basedpyright, pytest (+asyncio, cov), Bandit, pip-audit; ESLint, Prettier, tsc, Vitest | |

## 3. Hosting & deployment

- **Target:** a single host running Docker Compose (`compose.yaml`; `compose.dev.yaml` for infra-only dev).
- **Networks:** `internal` (no egress: Neo4j, Langfuse DB) and `public` (API, workers, gateway). Data services should never be published beyond localhost in production.
- **Ports:** nginx 8080, API 8000, Langfuse 3001, Qdrant 6333/6334, MinIO 9000/9001, Neo4j 7687, Postgres 5432, Ollama 11434 (host).
- **Hardware floor:** to be set from the model-sizing task; 7B model assumes a GPU or ≥ 16 GB RAM.
- **Productionising later:** ECS Fargate + RDS + ElastiCache + S3 + Qdrant Cloud + AuraDB; swap Ollama via LiteLLM env vars (this *does* end zero-egress and must be a deliberate choice).

## 4. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| Ollama | API/worker → host :11434 | Chat, embeddings, vision captions |
| Langfuse | API/worker → :3001 | Traces |
| Optional cloud LLMs (OpenAI, Anthropic, Groq, Gemini, Mistral, Together, Cohere) | API → internet | **Opt-in per user**, key Fernet-encrypted, SSRF-guarded |
| User-defined tools (API key / MCP) | API → tool endpoint | SSRF-guarded |

## 5. Configuration

Single source of truth: `.env` (see `.env.example`). Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (≥ 32 chars), `NEO4J_PASSWORD`, `NEXT_PUBLIC_API_URL`. Model defaults also live in `backend/app/config/models.yaml` and `prompts.yaml`.

## 6. Security requirements

- Argon2 password hashing; JWT (HS256 default) with refresh; SlowAPI rate limits.
- Fernet encryption for stored API keys; SSRF guard on every outbound request.
- Ownership check on every project/conversation/document access.
- Compose defaults (`minioadmin`, `change-me`, Langfuse admin password) **must** be overridden before any non-local deployment.
- CORS restricted to configured origins.

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Latency | First token ≤ 3 s; ingestion off the request path |
| Reliability | Health/ready probes; healthchecks on all data services; retries with backoff on LLM calls |
| Quality | Eval set of 50 QA pairs in CI (target) |
| Testability | Routers → services → repositories separation |
| Auditability | Traces per answer; structured logs with request ids |

## 8. Pipelines

- **RAG:** analyse → retrieve (hybrid, RRF) → rerank → gate (≥ 0.05, else HyDE retry) → compress → compose → stream.
- **Ingestion:** parse → metadata → caption → chunk (80-word child / 320-word parent) → enrich (3 hypothetical questions + summary) → embed → save.

## 9. Known documentation drift

These need a decision; the code is the source of truth today.

| Where | Says | Code does |
|-------|------|-----------|
| `SPEC.md` C2/C5 | pgvector + pg_trgm, ARQ | Qdrant, Celery |
| `README.md` quick start | `uvicorn src.main:app`, ARQ worker | `app.main:app`, Celery |
| `.ai/database.md` | pgvector `DocumentChunk`, `GeneratedVideo` | Chunks in Qdrant; video removed |
| `SPEC.md` routes | `/api/documents`, `/api/chat` | `/api/projects/{id}/documents`, `/api/projects/{id}/chat`, `/api/chat` for individual |
| `compose.yaml` | worker only for Celery | `pgvector`/`pg_trgm` still created in `infra/init-db.sql` |

**Decision required:** update `SPEC.md`, README and `.ai/*` to match this document.
