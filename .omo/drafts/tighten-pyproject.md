---
slug: tighten-pyproject
status: drafting
intent: clear
pending-action: write .omo/plans/tighten-pyproject.md
approach: <fill: the approach you intend to plan>
---

# Draft: tighten-pyproject

## Components (topology ledger)
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| pyproject.toml | Tighten dep ranges, add missing prod/test/lint deps | active | `backend/pyproject.toml` |
| Ruff config | Expand rule sets, add format config | active | `backend/pyproject.toml:63-69` |
| Pytest config | Production-grade ini config | active | `backend/pyproject.toml:70-72` |
| Coverage config | New `[tool.coverage.*]` sections | active | (not present yet) |
| Type checking | Replace `ty` with `basedpyright` | active | `backend/pyproject.toml:74-81` |
| Dependency groups | Split flat `dev` into lint/test/docs/benchmark/security | active | `backend/pyproject.toml:44-51` |
| Dockerfile | No changes needed (uses uv sync --frozen --no-dev) | deferred | `backend/Dockerfile` |
| CI/CD | No CI config exists yet — defer | deferred | no `.github/workflows/` |

## Open assumptions (announced defaults)
<!-- assumption | adopted default | rationale | reversible? -->
| psycopg[binary] as direct dep | Remove from pyproject.toml | It's only a transitive dep of langgraph-checkpoint-postgres; no direct imports in app code. langgraph-checkpoint-postgres keeps it available. | Yes — still in uv.lock transitively |
| pdfplumber removal | Remove from pyproject.toml | Not directly imported in app code (pdfplumber imported in idp_parser.py → actually IS imported). Keep it. | Yes |
| pdf2image + pytesseract | Keep both | Actively used in routes/extract.py (OCR pipeline) + idp_parser.py. Surya doesn't fully replace both yet. | Yes — code refactor could remove later |
| python-json-logger | Skip | Structlog already handles JSON logging | N/A |
| uvloop / httptools as explicit deps | Skip explicit add | Already pulled in by uvicorn[standard] — do not duplicate | Yes |
| orjson as explicit dep | Add explicitly | FastAPI can use ORJSONResponse for faster JSON; also already a transitive dep | Yes |

## Findings (cited - path:lines)

### Dependency overlap resolution

1. **asyncpg + psycopg** (`backend/pyproject.toml:12,23`)
   - `asyncpg`: SQLAlchemy async driver. DATABASE_URL pattern = `postgresql+asyncpg://` (`backend/app/config.py:11`)
   - `psycopg[binary]`: Required by `langgraph-checkpoint-postgres` (v3.0.5 uses psycopg-pool). No direct imports in app code.
   - **Decision**: Remove psycopg from direct deps. langgraph-checkpoint-postgres pulls it in transitively.

2. **PDF libraries** (`backend/pyproject.toml:33-37,40`)
   - `pymupdf` (fitz): Used in `backend/app/services/idp_parser.py:10` and `backend/app/services/agents/ingestion.py:125` for fast text extraction
   - `pdfplumber`: Used in `backend/app/services/idp_parser.py:12` for table extraction
   - `markitdown`: Used in `backend/app/services/ingestion.py:9` as general document parser
   - `pdf2image`: Used in `backend/app/services/idp_parser.py:14` (Surya OCR pipeline) and `backend/app/routes/extract.py:39` (pytesseract OCR pipeline)
   - `pytesseract`: Used in `backend/app/routes/extract.py:24,38` for OCR fallback on images/PDFs
   - `surya-ocr`: Used in `backend/app/services/idp_parser.py:238-253` for advanced OCR
   - **Decision**: Keep all as-is for now. Trimming pdf2image/pytesseract requires refactoring `routes/extract.py` and `idp_parser.py` — out of scope for a config-only pass.

3. **uvloop + httptools** — already part of `uvicorn[standard]` (see uv.lock lines 627, 151). Adding explicit duplicates is unnecessary.

### Existing test coverage
- 11 test files in `backend/tests/`
- `conftest.py` sets env vars for test DB/Redis/JWT
- No `pytest-mock`, `respx`, `faker`, `factory-boy`, `freezegun` currently
- No `pytest-xdist` for parallel test execution

### Existing lint infra
- Ruff with 6 rule sets (E, F, I, B, UP, N)
- `ty` for type checking with ALL rules set to ignore (= effectively disabled)
- No format config in pyproject.toml

### No CI present
- No `.github/workflows/` at all
- No `.pre-commit-config.yaml`

## Decisions (with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Tighten all dep ranges** to `<next_major>` | Reproducible builds per user spec |
| 2 | **Remove psycopg[binary] from direct deps** | Transitive only via langgraph-checkpoint-postgres |
| 3 | **Add 15+ new production deps** (orjson, opentelemetry-*, prometheus-client, cachetools, email-validator, python-dotenv, rich) | Per user spec — production-grade observability, serialization, caching |
| 4 | **Split dev group** into dev/lint/test/docs/benchmark/security | Lean CI/CD installs per user spec |
| 5 | **Replace `ty` with `basedpyright`** | `ty` config has ALL rules ignored = no type checking. basedpyright is the modern alternative. |
| 6 | **Expand Ruff rules** from 6 → 16 rule sets | Covers SIM, RET, RUF, ASYNC, C4, T20, PIE, PERF + existing |
| 7 | **Add Ruff format config** | quote-style double, docstring-code-format |
| 8 | **Add coverage config** | branch, show_missing, skip_empty |
| 9 | **Productionize pytest config** | addopts with -ra --strict-markers --strict-config --cov |
| 10 | **Add project metadata** | authors, readme, license, keywords |
| 11 | **Add security deps** (bandit, pip-audit) | Per user spec — run in CI |
| 12 | **Defer PDF library trimming** | Requires code changes beyond pyproject.toml |
| 13 | **Defer CI/CD config** | No `pyproject.toml` blocker, but no CI infra exists yet — tracked separately |
| 14 | **Defer pre-commit config** | No existing hooks; let CI do the gatekeeping |

## Scope IN

- `backend/pyproject.toml` — all changes to project, dependencies, tool configurations
- `backend/.gitignore` — add coverage dirs if missing
- Coverage and pytest config exclusively within pyproject.toml
- Project metadata (authors, readme, license, keywords)

## Scope OUT (Must NOT have)

- **No changes to product code** (app/, alembic/, tests/ logic) — this is a config-only plan
- **No Dockerfile changes** — `Dockerfile` uses `uv sync --frozen --no-dev` which works regardless of dep groups
- **No CI/CD pipeline** — deferred; no GitHub workflows exist
- **No pre-commit config** — deferred
- **No pdf2image/pytesseract removal** — needs code refactoring, out of scope
- **No Makefile changes** — works with existing commands
- **No renaming of the project** — stays `agentic-rag-backend`
- **No actual `uv lock` re-generation** — worker runs it after edits

## Open questions

*None.* All forks resolved by exploration or user specification.

## Approval gate
status: completed
executed: 2026-06-30
result: All todos and final wave checks passed. See .omo/notepads/tighten-pyproject/learnings.md
