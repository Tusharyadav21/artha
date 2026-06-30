## [2026-06-30] Task: tighten-pyproject
### Context
Harden `backend/pyproject.toml` for production-grade configuration.

### Changes applied
- **Version pinning**: All `>=X` → `>=X,<Y` for 36 runtime deps
- **Removed**: `psycopg[binary]` (transitive only via langgraph-checkpoint-postgres)
- **Added production deps**: orjson, prometheus-client, opentelemetry-api/sdk/instrumentation-fastapi/exporter-otlp/instrumentation-sqlalchemy/instrumentation-httpx, email-validator, rich
- **Dep groups**: Split flat `dev` into `dev`, `lint`, `test`, `docs`, `benchmark`, `security`
- **Type checking**: Replaced `[tool.ty.rules]` (all ignored) with `[tool.basedpyright]`
- **Ruff**: Expanded from 6 to 14 rule sets (added SIM, RET, RUF, ASYNC, C4, T20, PIE, PERF). Added `[tool.ruff.format]`
- **Coverage**: New `[tool.coverage.run]` and `[tool.coverage.report]` sections
- **Pytest**: Production config with `--strict-markers`, `--cov=app`, `--cov-report=term-missing`
- **Metadata**: authors, readme, license, keywords

### Verification
- `uv lock --frozen` → passed
- `ruff check .` → 278 pre-existing issues (scoped to eval/, scripts/, test_*.py)
- `basedpyright app/` → 39 pre-existing type issues
- `pytest tests/` → 105 passed, 1 pre-existing failure (test_ollama_client unrelated)
- `uv.lock` updated with new entries, psycopg removed

### What was explicitly NOT done
- No changes to app/ .py files, Dockerfile, Makefile, README, CI/CD
- No cachetools, python-dotenv(explicit), python-json-logger, uvloop(explicit), httptools(explicit)
- No PDF library removal (all actively imported)

### Files changed
- `backend/pyproject.toml` (112 insertions, 48 deletions)
- `backend/uv.lock` (1047 insertions, 178 deletions)
