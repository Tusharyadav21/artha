# Global Coding Standards

- Write clean, maintainable, production-ready code.
- Follow directory-scoped rules located in `.ai` or `.ai` subfolders for specific environments (e.g. backend vs frontend).

## Dependency & Tooling Conventions

- **Python**: Use `uv` for dependency management and `uv run` for executing Python tools.
- **Node**: Use `bun` for package management and dev server.
- **Linting**: Run `ruff check .` for Python, `bun run lint` for frontend.
- **Type checking**: Run `bun run typecheck` for frontend.
- **Testing**: Use `pytest` with `pytest-asyncio` for Python async tests; tests live in `backend/tests/`.

## Code Quality

- Prefer readability over cleverness.
- Add tests for critical flows (ingestion, RAG, auth).
- Avoid duplicated logic — extract shared utilities to `core/` or `lib/`.
- Keep modules small and focused on a single responsibility.

## Configuration

- All config values go to `core/config.py` `Settings` class — never hardcode environment-specific values.
- Import as `from core.config import settings`; access via `settings.some_field`.

## Error Handling

- Use `logger.exception()` in `except` blocks to capture stack traces.
- Async LLM/network calls must have timeouts via `asyncio.wait_for()`.
- Retry transient failures (LLM calls, embeddings) using `tenacity`.
- Async singletons must use `asyncio.Lock` with double-checked locking.

## Async Patterns

- All DB and network operations use `async def` / `await`.
- CPU-bound work (parsing, chunking) offloads to threads via `asyncio.to_thread()` or `run_in_executor`.
- Stream responses when possible (SSE for chat, chunked uploads).
- Keep async boundaries explicit — don't mix sync and async in the same call chain.
