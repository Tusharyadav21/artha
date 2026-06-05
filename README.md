# Agentic RAG
**A Local-First, Autonomous Agentic Retrieval-Augmented Generation Stack**

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

## b. Architecture overview

The system uses a decoupled local-first design:
- **Frontend**: Next.js (React) connecting via REST/SSE.
- **Backend API**: FastAPI routing requests to decoupled services and repositories.
- **Data Tier**: PostgreSQL (pgvector) for vectors, Neo4j for GraphRAG, Redis for task queuing.
- **Workers**: Arq tasks handle async document chunking and embedding.
- **Agent**: LangGraph orchestrates the stateful RAG flow (routing, HyDE, hybrid search, quality gates).

## c. Productionization & Scalability

To deploy this on a hyper-scaler (e.g., AWS):
- **Compute**: Containerize FastAPI and Arq workers; deploy on AWS ECS Fargate with autoscaling. Host the Next.js frontend on Vercel or AWS Amplify.
- **Data**: Migrate from local containers to managed AWS RDS Aurora PostgreSQL (with read replicas for search queries) and ElastiCache for Redis.
- **Vectors/Graph**: Keep pgvector for datasets under 10M chunks; scale to a dedicated vector DB like Pinecone/Milvus if larger. Transition Neo4j to Neo4j AuraDB.
- **Inference**: Move off local Ollama to Groq/Together AI for fast LLM inference, and OpenAI/Cohere for embeddings.
- **Storage**: Swap local disk ingestion for direct-to-S3 presigned uploads, streaming chunks directly via the background workers.

## d. RAG/LLM approach & decisions

- **LLM**: **Qwen 2.5 (3B)** via Ollama. Chosen for superior reasoning and strict prompt adherence locally without data leaks.
- **Embeddings**: **nomic-embed-text**. Chosen for its large 8192 context window and high MTEB ranking.
- **Vector DB**: **pgvector**. Eliminates sync issues by keeping relational metadata and vectors atomic in one transaction.
- **Orchestration**: **LangGraph**. Linear chains fail on ambiguity. LangGraph provides cyclical reasoning, HyDE expansion, and self-correction.
- **Context Management**: Employed parent-child chunking (dense 60-word child for search, 260-word parent for context injection).
- **Guardrails**: Reranking score normalization gates bad context. If the top score falls below 0.05, the agent falls back and explicitly warns the user instead of hallucinating.

## e. Key technical decisions and why

- **Decoupled Architecture**: Separated routers, services, and repositories. This isolates Cypher/SQL queries from HTTP handlers, making testing easier and API contracts stable.
- **Async Ingestion**: Offloaded PDF parsing and embedding to Redis/Arq workers. Synchronous processing would block the FastAPI event loop and cause timeouts on large uploads.
- **Reciprocal Rank Fusion (RRF)**: Merged vector cosine similarity with trigram keyword search to guarantee resilience against typos and exact-code matching where pure semantic search fails.

## f. Engineering standards

- **Followed**: 
  - Strict async/await FastAPI dependencies (`Depends()`).
  - Next.js Server/Client component splitting.
  - Ruff typing and code formatting checks.
- **Skipped**:
  - Full E2E Integration testing. Given the overhead of mocking Neo4j/Ollama in CI within realistic time constraints, I prioritized unit tests and core service validation instead.
  - External OAuth (used local credential hashing to keep the stack fully local and private).

## g. How AI tools were used

I used AI heavily to accelerate boilerplate and iterations:
- Drafted SQLAlchemy models, Pydantic schemas, and Alembic migrations.
- Diagnosed asynchronous session leaks during backend testing.
- Generated responsive Tailwind CSS layouts and UI components.
- Auto-generated Pytest mocks for database and Ollama endpoints.

## h. What I'd do differently with more time

1. **Reranking**: Switch to a dedicated API (like Cohere Rerank) for significantly better retrieval precision.
2. **Deep GraphRAG**: Implement global community summaries (entity resolution) rather than just 2-hop neighborhood traversals.
3. **Automated Evals**: Integrate Ragas or TruLens in CI to programmatically score faithfulness and context recall on every PR.
4. **IaC**: Write Terraform modules for one-click AWS infrastructure provisioning.
