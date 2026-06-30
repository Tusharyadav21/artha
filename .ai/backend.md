# Backend Service-Repository Architecture & DI

This document defines the decouple architectural rules, layer boundaries, and Dependency Injection lifecycle of the Python FastAPI backend.

---

## 1. Service-Repository Pattern Layers

We enforce decoupling across three distinct application boundaries to maximize testability:

```
[HTTP Client Request]
       │
       ▼
 1. Web Router Layer (api/)
       │  (Extracts JWT, validates input schemas via Pydantic)
       ▼
 2. Business Service Layer (services/)
       │  (Orchestrates business rules, models, and background tasks)
       ▼
 3. Repository Layer (repositories/)
          (Executes database-specific queries via SQLAlchemy engine)
```

### Layer Boundary Constraints
1. **API Router Layer (`src/api/` or `src/routers/`)**:
   - Handles: HTTP verbs, request paths, CORS, JWT extraction, rate limits, Pydantic inputs/outputs.
   - **Rule**: Must contain zero raw SQL statements or business decisions. Calls service classes.
2. **Business Service Layer (`src/services/`)**:
   - Handles: Calculation, planning, external API fetching, state orchestration.
   - **Rule**: Must remain completely decoupled from HTTP parameters, request/response lifecycles, and direct SQLAlchemy session queries.
3. **Repository Layer (`src/repositories/`)**:
   - Handles: Querying PostgreSQL tables, computing pgvector distances, and applying filters.
   - **Rule**: One repository per data model aggregate. Contains zero business decisions.

---

## 2. Async-First Operations

All network and database transactions must execute asynchronously:
* Use `AsyncSession` provided by SQLAlchemy for all database sessions.
* All methods in services and repositories that query DBs or fetch network resources must use `async def` and `await`.
* Ensure that CPU-bound operations (like Remotion video rendering or heavy parsing tasks) are offloaded to background threads or queues.

---

## 3. FastAPI Dependency Injection (`Depends`)

- **Central DI Pattern**: Inject services and database contexts dynamically using FastAPI `Depends()` in APIRouter paths:
  ```python
  @router.get("/")
  async def get_project_list(
      current_user: User = Depends(get_current_user),
      session: AsyncSession = Depends(get_db)
  ) -> List[ProjectRead]:
      repo = ProjectRepository(session)
      return await repo.list_for_user(current_user.id)
  ```
- **Mockability**: By injecting database engines and repositories, we can easily inject mocked equivalents during unit tests without modifying source codes.

---

## 4. Singleton Patterns

Expensive clients (OllamaClient, Reranker) use module-level singletons:
```python
_lock: asyncio.Lock = asyncio.Lock()
_client: OllamaClient | None = None

async def _get_ollama_client() -> OllamaClient:
    global _client
    if _client is None:
        async with _lock:
            if _client is None:
                _client = OllamaClient()
    return _client
```
- Always use `asyncio.Lock` (double-checked locking) for async singletons.
- Redis client is initialized once in `core.redis_client.get_redis()`.

---

## 5. Config-Driven Design

All tunable values come from `src.core.config.settings`:
- Thresholds (relevance, HyDE complexity, history limits)
- Timeouts (ingestion enrichment, LLM generation)
- Limits (semaphore concurrency, max chunk tokens, upload size)
- Model names (reasoner, embed)

Never hardcode magic numbers — add a field to `Settings` and import via `from core.config import settings`.
