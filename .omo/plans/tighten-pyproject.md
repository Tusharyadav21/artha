# tighten-pyproject - Work Plan

## TL;DR (For humans)

**What you'll get:** A production-grade `pyproject.toml` for the Artha backend — version-pinned deps for reproducible builds, observability (OpenTelemetry + Prometheus), proper type checking via basedpyright, expanded Ruff linting, split dependency groups, and security scanning tools. Zero changes to application code.

**Why this approach:** The `pyproject.toml` is the single source of truth for the Python project. Fixing it once avoids fragile builds, blind type gaps, and missing observability hooks. Splitting dep groups lets CI install only what each job needs.

**What it will NOT do:** Touch any `.py` file, the Dockerfile, Makefile, CI/CD workflows, or README. Not remove any PDF library (code depends on them). Not create a pre-commit config.

**Effort:** Short
**Risk:** Low — all changes are config-only; `uv lock --frozen` validates every edit immediately.

**Decisions to sanity-check:** (1) The exact OpenTelemetry version bound for instrumentation packages; (2) Whether to pin `basedpyright` to `<2` or a wider range.

Your next move: **Approve** to begin execution. Full detail below.

---

> TL;DR (machine): Short effort, Low risk — version pin + add observability/type-checking/security deps + split dep groups + expand ruff/coverage/pytest config in backend/pyproject.toml only. No code changes.

## Scope
### Must have
- **Version pinning**: All dependency ranges from `>=X` to `>=X,<Y` (upper bound at next major)
- **Deduplication**: Remove `psycopg[binary]` from direct dependencies (transitive only)
- **Production deps**: Add `orjson`, `prometheus-client`, `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-instrumentation-fastapi`, `opentelemetry-exporter-otlp`, `email-validator`, `rich`
- **Test deps**: Add `pytest-mock`, `pytest-xdist`, `respx`, `faker`, `factory-boy`, `freezegun`
- **Lint deps**: Add `basedpyright`, `ruff` (moved from dev group)
- **Security deps**: Add `bandit`, `pip-audit`
- **Tool sections**: Ruff expanded rules + format config; basedpyright config; coverage config; production pytest ini
- **Split dep groups**: `dev`, `lint`, `test`, `docs`, `benchmark`, `security`
- **Project metadata**: authors, readme, license, keywords

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No changes to any `.py` file in `app/`, `alembic/`, or `tests/`
- No changes to `Dockerfile`, `Makefile`, README, `.env.example`
- No creation of CI/CD workflows (`.github/workflows/`)
- No pre-commit config creation
- Do not add: `cachetools`, `python-dotenv` (explicit), `python-json-logger`, `uvloop`(explicit), `httptools`(explicit)
- Do not remove: `pytesseract`, `pdf2image`, `pdfplumber` (code actively uses them)

## Verification strategy
- Test decision: **tests-after** — run `uv lock --frozen` (validates TOML + resolution), then `uv run ruff check .` + `uv run basedpyright .`, then `uv run pytest --coverage` to confirm test infra is intact.
- Evidence: `.omo/evidence/tighten-pyproject/` — each todo produces a validation log.

## Execution strategy
### Execution waves
Only one wave — all edits are to a single file (`pyproject.toml`) and can be applied sequentially in one pass. No parallelization needed.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | — | 2,3,4,5,6,7 | — |
| 2 | 1 | — | 3,4,5,6,7 |
| 3 | 1 | — | 2,4,5,6,7 |
| 4 | 1 | — | 2,3,5,6,7 |
| 5 | 1 | — | 2,3,4,6,7 |
| 6 | 1 | — | 2,3,4,5,7 |
| 7 | 1 | — | 2,3,4,5,6 |

Todos 2–7 can be applied in any order after the pyproject.toml skeleton is ready.

## Todos

<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

- [x] 1. **Pin all dependency versions with upper bounds**
  **What to do:** Edit `backend/pyproject.toml` lines 6–41. Replace every open-ended `>=X` constraint with `>=X,<Y` where `Y = X + 1` (next major). Also remove `psycopg[binary]>=3.3` from the dependencies list (not directly imported).
  **Must NOT do:** Do not change the dependency names or remove any other dependency — only tighten ranges and remove psycopg.
  **Parallelization:** Wave 1 | Blocked by: — | Blocks: 2–7
  **References:** `backend/pyproject.toml:6-42` (current deps), `backend/app/config.py:11` (asyncpg-only URL), grep result: no `import psycopg` in `app/`
  **Acceptance criteria:** `uv lock --frozen` exits 0. `grep -c 'psycopg' backend/pyproject.toml` returns 0. Every dep line matches pattern `>=<digits>.<digits>,<<digits>`.
  **QA scenarios:**
    - Happy: `uv lock --frozen` succeeds
    - Failure: introduce a deliberately bad bound and confirm `uv lock --frozen` fails
  **Evidence:** `.omo/evidence/tighten-pyproject/task-1-pin-versions.log`
  **Commit:** Y | `chore(pyproject): pin dep ranges, remove redundant psycopg`

- [x] 2. **Add production dependencies**
  **What to do:** Add to `backend/pyproject.toml` `[project] dependencies` list:
    - `orjson>=3.11,<4`
    - `prometheus-client>=0.23,<1`
    - `opentelemetry-api>=1.36,<2`
    - `opentelemetry-sdk>=1.36,<2`
    - `opentelemetry-instrumentation-fastapi>=0.57b0`
    - `opentelemetry-exporter-otlp>=1.36,<2`
    - `email-validator>=2.2,<3`
    - `rich>=14,<15`
  **Must NOT do:** Do NOT add `cachetools`, `python-dotenv`, `python-json-logger`, `uvloop`, `httptools` as explicit deps.
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:6-42`
  **Acceptance criteria:** `uv lock --frozen` exits 0. Each listed package appears in `uv run pip list`.
  **QA scenarios:**
    - Happy: `uv run python -c "import orjson; import prometheus_client; import opentelemetry; import email_validator; import rich"` all succeed
    - Failure: remove one dep and confirm import fails
  **Evidence:** `.omo/evidence/tighten-pyproject/task-2-prod-deps.log`
  **Commit:** Y | `feat(pyproject): add production deps for observability/serialization/validation`

- [x] 3. **Split dependency groups and add test/lint/security deps**
  **What to do:** Replace the flat `[dependency-groups] dev` block with:
    ```toml
    [dependency-groups]
    dev = [
        "watchfiles>=0.24,<1",
    ]
    lint = [
        "ruff>=0.7,<1",
        "basedpyright>=1.29,<2",
    ]
    test = [
        "pytest>=8.3,<9",
        "pytest-cov>=6.1,<7",
        "pytest-asyncio>=0.24,<1",
        "pytest-mock>=3.14,<4",
        "pytest-xdist>=3.6,<4",
        "respx>=0.22,<1",
        "faker>=37,<38",
        "factory-boy>=3.3,<4",
        "freezegun>=1.5,<2",
    ]
    docs = [
        "mkdocs-material>=9.6,<10",
        "mkdocstrings[python]>=0.29,<1",
    ]
    benchmark = [
        "pytest-benchmark>=5.1,<6",
    ]
    security = [
        "bandit>=1.8,<2",
        "pip-audit>=2.9,<3",
    ]
    ```
  **Must NOT do:** Do not remove `watchfiles` or any existing dev dep functionality. Do not add deps not listed above.
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:44-51` (current dev group)
  **Acceptance criteria:** `uv sync --group lint --group test --group security` exits 0. `uv run ruff --version` works. `uv run basedpyright --version` works. `uv run bandit --version` works.
  **QA scenarios:**
    - Happy: each group installs independently: `uv sync --no-dev --group lint` then `uv run ruff check .`
    - Failure: remove a dep and confirm group-specific install fails
  **Evidence:** `.omo/evidence/tighten-pyproject/task-3-dep-groups.log`
  **Commit:** Y | `feat(pyproject): split dep groups for lean CI installs`

- [x] 4. **Replace ty config with basedpyright config; add Ruff format + expanded rules**
  **What to do:**
    1. **Remove** the entire `[tool.ty.rules]` block (lines 74–81).
    2. **Add** under `[tool.ruff]`:
        ```toml
        [tool.ruff.lint]
        select = [
            "E", "F", "I", "UP", "B", "SIM", "RET", "RUF",
            "N", "ASYNC", "C4", "T20", "PIE", "PERF",
        ]
        ```
    3. **Add**:
        ```toml
        [tool.ruff.format]
        quote-style = "double"
        indent-style = "space"
        docstring-code-format = true
        ```
    4. **Add**:
        ```toml
        [tool.basedpyright]
        include = ["app"]
        typeCheckingMode = "standard"
        reportMissingTypeStubs = "warning"
        reportUnusedImport = "error"
        ```
  **Must NOT do:** Do not modify any existing Ruff `[tool.ruff]` base settings (line-length, target-version). Do not destroy the existing select list — append to it.
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:63-69` (current Ruff), `backend/pyproject.toml:74-81` (ty block to remove)
  **Acceptance criteria:** `uv run ruff check .` passes (or shows same or fewer violations). `uv run ruff format . --check` does not error. `uv run basedpyright .` runs (may show typing issues — that's expected).
  **QA scenarios:**
    - Happy: `uv run ruff check .` exits 0 after fixing any existing issues with `ruff check --fix`
    - Failure: remove basedpyright config and confirm `uv run basedpyright .` fails with missing config
  **Evidence:** `.omo/evidence/tighten-pyproject/task-4-lint-type-check.log`
  **Commit:** Y | `feat(pyproject): replace ty with basedpyright, expand ruff rules, add format config`

- [x] 5. **Add coverage and pytest config**
  **What to do:** Append after the Ruff format section:
    ```toml
    [tool.coverage.run]
    branch = true
    source = ["app"]

    [tool.coverage.report]
    show_missing = true
    skip_empty = true
    ```
    Then **replace** the current `[tool.pytest.ini_options]` block with:
    ```toml
    [tool.pytest.ini_options]
    asyncio_mode = "auto"
    testpaths = ["tests"]
    pythonpath = ["."]
    addopts = [
        "-ra",
        "--strict-markers",
        "--strict-config",
        "--cov=app",
        "--cov-report=term-missing",
    ]
    ```
  **Must NOT do:** Do not remove existing `asyncio_mode = "auto"` or `pythonpath = ["."]` settings.
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:70-72` (current pytest config)
  **Acceptance criteria:** `uv run pytest --collect-only` succeeds and shows test discovery. `uv run pytest --coverage --dry-run` shows coverage config is parsed.
  **QA scenarios:**
    - Happy: `uv run pytest tests/test_config.py -v` runs and reports coverage
    - Failure: check that `--strict-markers` catches unregistered markers by adding a `@pytest.mark.bogus` marker
  **Evidence:** `.omo/evidence/tighten-pyproject/task-5-coverage-pytest.log`
  **Commit:** Y | `feat(pyproject): add coverage config, productionize pytest settings`

- [x] 6. **Add OpenTelemetry instrumentation deps for SQLAlchemy and httpx**
  **What to do:** Add to `[project] dependencies`:
    - `opentelemetry-instrumentation-sqlalchemy>=0.57b0`
    - `opentelemetry-instrumentation-httpx>=0.57b0`
  **Must NOT do:** Do not add `opentelemetry-instrumentation` base package (it's a dependency of the specific instrumentations).
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:6-42`
  **Acceptance criteria:** `uv lock --frozen` exits 0. `uv run python -c "import opentelemetry.instrumentation.sqlalchemy; import opentelemetry.instrumentation.httpx"` succeeds.
  **QA scenarios:**
    - Happy: import both packages
    - Failure: remove one and confirm import error
  **Evidence:** `.omo/evidence/tighten-pyproject/task-6-otel-extra.log`
  **Commit:** Y | `feat(pyproject): add OTEL instrumentation for sqlalchemy and httpx`

- [x] 7. **Add project metadata**
  **What to do:** Insert at the top of `[project]`, after the `description` line:
    ```toml
    authors = [
        { name = "Tushar Yadav" },
    ]
    readme = "README.md"
    license = { text = "MIT" }
    keywords = [
        "fastapi",
        "langgraph",
        "rag",
        "llm",
        "agentic-ai",
    ]
    ```
  **Must NOT do:** Do not change the project name, version, or description.
  **Parallelization:** Wave 1 | Blocked by: 1 | Blocks: —
  **References:** `backend/pyproject.toml:1-5`
  **Acceptance criteria:** `uv lock --frozen` exits 0. `uv run python -c "import tomllib; d = tomllib.load(open('backend/pyproject.toml','rb')); assert d['project']['license']['text'] == 'MIT'"`
  **QA scenarios:**
    - Happy: metadata parsed correctly
    - Failure: corrupt the TOML and confirm `uv lock --frozen` fails with parse error
  **Evidence:** `.omo/evidence/tighten-pyproject/task-7-metadata.log`
  **Commit:** Y | `chore(pyproject): add project metadata (authors, license, keywords)`

## Final verification wave
> Runs in parallel after ALL todos complete. ALL must APPROVE before declaring done.
- [x] F1. **Lock file integrity**: `cd backend && uv lock --frozen` exits 0. No warnings about unused/invalid deps.
- [x] F2. **Lint + type check**: `cd backend && uv run --group lint ruff check . && uv run --group lint basedpyright .` — may produce warnings, must not crash or hang.
- [x] F3. **Test infra works**: `cd backend && uv run --group test pytest tests/test_config.py -v` — at least the test suite runs and discovers tests.
- [x] F4. **Scope fidelity audit**: grep `backend/pyproject.toml` for forbidden additions: `cachetools`, `python-dotenv` (as explicit dep), `python-json-logger`, `uvloop` (as explicit dep), `httptools` (as explicit dep). None should appear.
- [x] F5. **No code drift**: `git diff --stat` — only `backend/pyproject.toml` + `backend/uv.lock` changed. No `.py` files changed.

## Commit strategy
One commit per todo is fine for this plan (7 commits), but they can also be squashed into 2–3 logical commits:
- **Commit 1**: Pin versions + metadata + remove psycopg (todos 1, 7)
- **Commit 2**: Dep groups + new deps (todos 2, 3, 6)
- **Commit 3**: Tool configs (todos 4, 5)

Each commit message uses Conventional Commits (`feat`/`chore` scoped to `pyproject`).

## Success criteria
- `cd backend && uv lock --frozen && uv sync --frozen && uv run --group test pytest` exits 0
- `cd backend && uv run --group lint ruff check .` exits 0
- `cd backend && uv run --group lint basedpyright .` runs (warnings acceptable)
- `git diff --name-only` shows ONLY `backend/pyproject.toml` changed
