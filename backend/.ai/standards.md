# Backend Standards

## Code Quality

- **Strict typing:** All functions have typed signatures. No `Any`, no `object` where a concrete type works.
- **Async-first:** All database and network operations use `async def` / `await`. CPU-bound work offloaded to `asyncio.to_thread()`.
- **Pydantic validation:** Every API input validated at the router boundary. Schemas in `schemas/` mirror domain models.
- **Config-driven:** Never hardcode magic numbers — add a field to `Settings` in `core/config.py`.

## Error Handling

- Use `logger.exception()` in `except` blocks to capture stack traces.
- Async LLM/network calls must have timeouts via `asyncio.wait_for()`.
- Retry transient failures (LLM calls, embeddings) using `tenacity` with exponential backoff.
- Async singletons must use `asyncio.Lock` with double-checked locking.

## Testing

- Tests in `backend/tests/` using `pytest` + `pytest-asyncio`.
- Mock external services (Ollama, Redis) at the service layer.
- Repository tests use a test database with rollback isolation.

## Linting & Formatting

- **Linter:** `ruff check .` (configured in `pyproject.toml`)
- **Formatter:** `ruff format .`
- All checks run in CI.
