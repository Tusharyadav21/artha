# Artha

**Artha** is a local-first, agentic AI workspace — built for meaning, wealth, and purpose.

> *Artha* (अर्थ) carries three meanings in Sanskrit:
> - **Meaning** → RAG extracts *meaning* from your documents, not just keywords
> - **Wealth** → Financial document insights are a first-class use case
> - **Purpose** → The broader platform goal: an AI that works *for* you, not just *with* you

---

## a. Quick setup instructions

1. **Prerequisites**: Docker & Docker Compose, Python 3.12 (`uv`), Bun 1.0+, Ollama.
2. **Download Models**:
   ```bash
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```
3. **Start Infrastructure**:
   ```bash
   docker compose -f compose.dev.yaml up -d
   ```
4. **Backend**:
   ```bash
   cd backend
   uv sync
   uv run alembic upgrade head
   uv run uvicorn src.main:app --reload
   ```
5. **Frontend**:
   ```bash
   cd frontend
   bun install
   bun run dev
   ```

*Alternatively, use the interactive launcher: `./run.sh`*

---

## b. Architecture overview

The system uses a decoupled local-first design:
- **Frontend**: Next.js (React) connecting via REST/SSE.
- **Backend API**: FastAPI routing requests to decoupled services and repositories.
- **Data Tier**: PostgreSQL (pgvector) for vectors, Neo4j for GraphRAG, Redis for task queuing.
- **Workers**: Arq tasks handle async document chunking and embedding.
- **Agent**: LangGraph orchestrates the stateful RAG flow (routing, HyDE, hybrid search, quality gates).
- **BYOK**: Bring Your Own Keys — plug in OpenAI, Anthropic, Groq, Gemini, Mistral, Together, or Cohere. Falls back to local Ollama if no key is configured.

---

## c. BYOK — Bring Your Own Keys

Artha supports any major LLM provider. Set your API key once via the settings panel (or the API) and all RAG queries will use it.

**Supported providers:**

| Provider | Chat | Notes |
|---|---|---|
| OpenAI | ✓ | `gpt-4o-mini` default |
| Anthropic | ✓ | `claude-3-5-haiku-latest` default |
| Groq | ✓ | `llama-3.3-70b-versatile` default |
| Google Gemini | ✓ | `gemini-2.0-flash` default |
| Mistral | ✓ | `mistral-small-latest` default |
| Together AI | ✓ | `Llama-3.3-70B-Instruct-Turbo` default |
| Cohere | ✓ | `command-r-plus-08-2024` default |
| Ollama (local) | ✓ | **Default** — no key required |

**API:**
```
POST   /api/llm-config          — save/update provider + key + settings
GET    /api/llm-config          — read active config (key masked)
DELETE /api/llm-config          — remove key (reverts to Ollama)
POST   /api/llm-config/test     — validate the key with a live ping
```

**Key storage:** API keys are encrypted at rest using Fernet (AES-128-CBC + HMAC-SHA256) before being stored in PostgreSQL. The encryption key is derived from your `JWT_SECRET`.

**Retry logic:** Every provider client uses exponential backoff with jitter via `tenacity`. Defaults: 3 retries, 1s base delay, up to 30s. All configurable per-user.

---

## d. Productionization & Scalability

To deploy on a hyper-scaler (e.g., AWS):
- **Compute**: Containerize FastAPI and Arq workers; deploy on AWS ECS Fargate with autoscaling. Host the Next.js frontend on Vercel or AWS Amplify.
- **Data**: Migrate to managed AWS RDS Aurora PostgreSQL (with read replicas) and ElastiCache for Redis.
- **Vectors/Graph**: Keep pgvector for datasets under 10M chunks; scale to Pinecone/Milvus if larger. Transition Neo4j to Neo4j AuraDB.
- **Inference**: BYOK allows routing directly to Groq/Together AI/OpenAI — no infrastructure changes required.
- **Storage**: Swap local disk ingestion for direct-to-S3 presigned uploads.

---

## e. RAG/LLM approach & decisions

- **LLM**: **Qwen 2.5** via Ollama by default. BYOK lets you swap to any provider per-user.
- **Embeddings**: **nomic-embed-text** (768-dim). Always local — changing embed models requires re-indexing.
- **Vector DB**: **pgvector**. Atomic relational + vector storage eliminates sync issues.
- **Orchestration**: **LangGraph**. Provides cyclical reasoning, HyDE expansion, and self-correction.
- **Context Management**: Parent-child chunking (dense 60-word child for search, 260-word parent for context injection).
- **Guardrails**: Reranking score normalization. Scores below 0.05 trigger a fallback instead of hallucination.

---

## f. Key technical decisions and why

- **Decoupled Architecture**: Separated routers, services, and repositories. Isolates SQL/Cypher from HTTP handlers.
- **Async Ingestion**: PDF parsing and embedding offloaded to Redis/Arq workers. Prevents event-loop blocking on large uploads.
- **Reciprocal Rank Fusion (RRF)**: Merges vector cosine similarity with trigram keyword search for typo-resilience.
- **BYOK over a single hosted model**: Each user brings their own key, so inference cost scales with the user, not the platform.

---

## g. Engineering standards

- **Followed**:
  - Strict async/await FastAPI dependencies (`Depends()`).
  - Next.js Server/Client component splitting.
  - Ruff typing and code formatting checks.
- **Skipped**:
  - Full E2E integration testing (Neo4j/Ollama mock overhead).
  - External OAuth (local credential hashing keeps the stack fully private).

---

## h. How AI tools were used

- Drafted SQLAlchemy models, Pydantic schemas, and Alembic migrations.
- Diagnosed asynchronous session leaks during backend testing.
- Generated responsive Tailwind CSS layouts and UI components.
- Auto-generated Pytest mocks for database and Ollama endpoints.

---

## i. What I'd do differently with more time

1. **Reranking**: Switch to a dedicated API (Cohere Rerank) for better retrieval precision.
2. **Deep GraphRAG**: Implement global community summaries (entity resolution) rather than just 2-hop traversals.
3. **Automated Evals**: Integrate Ragas or TruLens in CI to score faithfulness and context recall on every PR.
4. **IaC**: Write Terraform modules for one-click AWS infrastructure provisioning.
5. **Financial Pipeline**: Dedicated document parsers for balance sheets, P&L statements, and structured table extraction.
