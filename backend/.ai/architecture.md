# Backend Architecture Rules

Core architectural principles for the Python / FastAPI backend.

## Layer Separation (Clean Architecture)

```
[Router] → [Service] → [Repository] → [Database]
```

- **Routers** (`routers/`): HTTP handling only. Extract JWT, validate Pydantic schemas, call services. No SQL, no business logic.
- **Services** (`services/`): Business logic orchestration. Call repositories, invoke LLMs, manage state. No HTTP awareness.
- **Repositories** (`repositories/`): Data access. SQLAlchemy async queries, vector search, CRUD. No business decisions.
- **Domain** (`domain/models.py`): ORM models only. No logic beyond relationships and constraints.

## Dependency Injection

- Use FastAPI `Depends()` for `get_db` (AsyncSession) and `get_current_user`.
- Repositories are instantiated per-request with the session from DI.
- Services can receive repositories or sessions via constructor injection.

## Module-Level Singletons

Expensive clients (OllamaClient, Reranker) use module-level singletons with double-checked locking:

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

## Authorization Pattern

Every repository method that returns user-scoped data must accept a `user_id` parameter and filter by ownership:

```python
async def list_for_user(self, user_id: UUID) -> list[Project]:
    stmt = select(Project).where(Project.owner_id == user_id)
    result = await self.session.execute(stmt)
    return result.scalars().all()
```

## Config-Driven Design

All tunable values from `src.core.config.settings`. Never hardcode:
- Thresholds (relevance, HyDE, history limits)
- Timeouts (ingestion enrichment, LLM generation)
- Limits (semaphore concurrency, max chunk tokens, upload size)
- Model names (reasoner, embed)
