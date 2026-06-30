# unify-llm-consolidate-backend - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** One unified LLM client (Ollama/OpenAI/Gemini/Claude switchable via UI), cleaned SSE endpoints, wired ARQ memory extraction, ~400 lines less dead code.

**Why this approach:** Two competing LLM wrappers become one `LiteLLMClient` with embed + vision methods — tool-calling works across all providers. Memory stub gets real ARQ wiring. Both streaming endpoints share one SSE contract for future MCP tool events.

**What it will NOT do:** Change the RAG graph topology, add MCP tool routing, touch the frontend.

**Effort:** Large
**Risk:** Medium - embed/vision paths lack existing test coverage, need manual QA
**Decisions to sanity-check:** Embeddings via `litellm.aembedding()` instead of direct Ollama HTTP call; `validate_models()` becomes standalone

Your next move: Implementation follows below.

---

> TL;DR (machine): Large effort, Medium risk — unify two LLM clients into LiteLLMClient, delete dead legacy aliases, wire ARQ memory extraction, consolidate two SSE endpoints into one shared format, fix Langfuse inconsistency in runtime.py.

## Scope
### Must have
- All LLM calls (generate, stream_generate, embed, generate_with_images) go through `LiteLLMClient`
- `OllamaClient` removed or reduced to minimal shim
- 4 dead legacy aliases deleted; `OllamaAdapter` becomes `LiteLLMClient` alias
- `MemoryManager.trigger_background_extraction()` enqueues real ARQ job
- `WorkerSettings` includes `extract_and_store_memory`
- `routes/agents.py` uses same `_event()` SSE format as `routes/chat.py`
- `runtime.py` uses `safe_span`/`safe_end` from `langfuse_utils`
- Inline imports fixed in `routes/agents.py`
- Shared `app/utils/sse.py` created

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do NOT change RAG graph topology or search quality
- Do NOT add MCP tool routing or plugin system
- Do NOT touch frontend code
- Do NOT remove existing test coverage
- Do NOT change schema or DB models

## Verification strategy
- Test decision: tests-after + pytest
- Evidence: `.omo/evidence/` per task
- After all tasks: `uv run pytest tests/ --cov` ≥65%, `uv run ruff check app/` zero new violations, `bash scripts/test.sh` green

## Execution strategy
### Parallel execution waves
- Wave 1 (parallelizable): T1 (llm_client.py), T1b (ollama.py strip), T8 (sse.py + routes/agents.py inline imports), T9 (runtime.py langfuse)
- Wave 2 (depends on T1): T3 (rag.py), T4 (agents/ingestion.py), T5 (vision.py), T6 (memory_worker.py)
- Wave 3 (depends on T1): T7 (ARQ wiring: memory_manager.py + arq_worker.py) — independent of Wave 2
- Wave 4 (depends on Wave 2+3): Verify → pre-push hook

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. llm_client.py | — | 3,4,5,6 | 1b,8,9 |
| 1b. ollama.py strip | — | — | 1,8,9 |
| 3. rag.py | 1 | Wave3,4,5,6 | 7 |
| 4. agents/ingestion.py | 1 | Wave3 | 3,5,6 |
| 5. vision.py | 1 | Wave3 | 3,4,6 |
| 6. memory_worker.py | 1 | Wave3 | 3,4,5 |
| 7. ARQ wiring | — | Wave3 | — |
| 8. SSE consolidation | — | Wave4 | 1,1b,9 |
| 9. runtime.py langfuse | — | Wave4 | 1,1b,8 |

## Todos
> Implementation + Test = ONE todo. Never separate.
- [x] 1. llm_client.py: Add embed() + generate_with_images(), delete dead aliases
  What to do / Must NOT do: Delete 4 dead aliases (OpenAICompatibleClient, AnthropicClient, GeminiClient, CohereClient). Keep OllamaAdapter as `OllamaAdapter = LiteLLMClient`. Add `embed(text, model_name)` and `generate_with_images(prompt, images, model_name, ...)` to `BaseLLMClient` (abstract) and `LiteLLMClient` (implementation). embed() uses `litellm.aembedding()` with Redis caching (port TTL logic from OllamaClient.embed()). generate_with_images() uses `acompletion()` with content blocks `[{"type":"text","text":prompt},{"type":"image_url","image_url":{"url":"data:image/...;base64,..."}}]`.
  Parallelization: Wave 1 | Blocked by: — | Blocks: T3,T4,T5,T6
  References: `app/services/llm_client.py`, `app/services/ollama.py:138-163` (embed logic), `app/utils/redis_client.py`
  Acceptance criteria: `uv run pytest tests/test_schemas.py tests/test_security_extended.py tests/test_security.py tests/test_auth_schema.py` passes. All old imports still resolve.
  QA: None this task (pure addition, no callers yet)
  Commit: Y | refactor(llm): unify embed+vision into LiteLLMClient

- [x] 2. ollama.py: Strip to validate_models shim
  What to do / Must NOT do: Delete OllamaClient class. Promote validate_models() to standalone async function at module level. Keep get_ollama_client() as backward-compat returning LiteLLMClient. Delete: _is_retryable, _ollama_lock, _build_retry, _request, _request_with_retry, _compute_embedding, generate, stream_generate, generate_with_images, embed, __init__, _get_client, close.
  Parallelization: Wave 1 | Blocked by: T1 | Blocks: —
  References: `app/services/ollama.py`
  Acceptance criteria: `uv run pytest tests/` passes. `uv run python -c "from app.services.ollama import get_ollama_client, validate_models"` works.
  QA: None
  Commit: Y | refactor(ollama): strip to validate_models standalone, delete OllamaClient

- [x] 3. rag.py: Use LiteLLMClient for embeddings
  What to do / Must NOT do: Remove `from app.services.ollama import get_ollama_client`. Remove `from app.services.llm_client import BaseLLMClient, OllamaAdapter`. Add `from app.services.llm_client import BaseLLMClient, LiteLLMClient`. In retrieve() node closure: replace `get_ollama_client() → ollama_client.embed()` with `llm_client.embed()` — llm_client is already available in the closure. In prepare_rag_context(): change `OllamaAdapter()` to `LiteLLMClient(...)`.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: Wave 4 verify
  References: `app/services/agents/rag.py:13,197-198,424-425`
  Acceptance criteria: `uv run pytest tests/` passes.
  QA: None (no test for this code path; manual verify in Wave 4)
  Commit: Y | refactor(rag): replace OllamaClient with LiteLLMClient

- [x] 4. agents/ingestion.py: Use LiteLLMClient for metadata extraction
  What to do / Must NOT do: Replace `from app.services.ollama import get_ollama_client` + `ollama = await get_ollama_client()` + `ollama.generate(...)` with `LiteLLMClient(...).generate(...)`. Use settings.ollama_model_reasoner for model.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: Wave 4 verify
  References: `app/services/agents/ingestion.py:19,145-155`
  Acceptance criteria: `uv run pytest tests/` passes.
  QA: None
  Commit: Y | refactor(ingestion-agent): replace OllamaClient with LiteLLMClient

- [x] 5. vision.py: Use LiteLLMClient.generate_with_images()
  What to do / Must NOT do: Replace `from app.services.ollama import OllamaClient` + `OllamaClient().generate_with_images(...)` with `from app.services.llm_client import LiteLLMClient` + `LiteLLMClient(...).generate_with_images(...)`.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: Wave 4 verify
  References: `app/services/vision.py:46-52`
  Acceptance criteria: `uv run pytest tests/` passes.
  QA: None
  Commit: Y | refactor(vision): replace OllamaClient with LiteLLMClient

- [x] 6. memory_worker.py: Use LiteLLMClient.generate()
  What to do / Must NOT do: Replace `from app.services.ollama import OllamaClient` + `OllamaClient().generate(...)` with `from app.services.llm_client import LiteLLMClient` + `LiteLLMClient(...).generate(...)`.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: Wave 4 verify
  References: `app/services/memory_worker.py:9,46`
  Acceptance criteria: `uv run pytest tests/` passes.
  QA: None
  Commit: Y | refactor(memory-worker): replace OllamaClient with LiteLLMClient

- [x] 7. ARQ wiring: memory_manager.py + arq_worker.py
  What to do / Must NOT do: In memory_manager.py trigger_background_extraction(): import arq.create_pool + RedisSettings. Create pool from settings.redis_url. Call redis.enqueue_job('extract_and_store_memory', str(conversation_id), str(workspace_id)). Replace stub body. In arq_worker.py: add `from app.services.memory_worker import extract_and_store_memory`. Add to WorkerSettings.functions.
  Parallelization: Wave 3 | Blocked by: — | Blocks: —
  References: `app/services/agents/memory_manager.py:51-67`, `app/services/arq_worker.py:86`
  Acceptance criteria: `uv run pytest tests/` passes. `uv run python -c "from app.services.arq_worker import WorkerSettings; assert 'extract_and_store_memory' in WorkerSettings.functions"`
  QA: None
  Commit: Y | feat(memory): wire background memory extraction to ARQ

- [x] 8. SSE consolidation: shared util + agents.py + chat.py
  What to do / Must NOT do: Create app/utils/sse.py with `def sse_event(event: str, data: Any) -> str:` (same body as current _event). In routes/chat.py: remove local _event(), import from app.utils.sse. In routes/agents.py: use sse_event() instead of inline `f"data: ..."`. Fix inline `from uuid import uuid4` → top-level import. Fix inline `import json` → top-level import.
  Parallelization: Wave 1 | Blocked by: — | Blocks: Wave 4 verify
  References: `app/routes/chat.py:29-31`, `app/routes/agents.py:51,59,60`
  Acceptance criteria: `uv run pytest tests/` passes. `uv run ruff check app/utils/sse.py app/routes/chat.py app/routes/agents.py` zero violations.
  QA: None (no test; manual verify in Wave 4)
  Commit: Y | refactor(sse): consolidate streaming event format

- [x] 9. runtime.py: Use langfuse_utils consistently
  What to do / Must NOT do: Replace inline self.lf.trace() → safe_span(trace, name=...). Replace trace.update() → safe_end(span, ...) or safe_trace_update(). Replace self.lf.flush() → safe_trace_update(..., langfuse_client=self.lf). Import from app.utils.langfuse_utils.
  Parallelization: Wave 1 | Blocked by: — | Blocks: Wave 4 verify
  References: `app/services/agents/runtime.py:90-101,131-132,138-139,143-144`
  Acceptance criteria: `uv run pytest tests/` passes.
  QA: None
  Commit: Y | refactor(runtime): use safe_span/safe_end consistently

## Final verification wave
- [x] F1. Plan compliance audit — all 9 tasks done, checkboxes marked
- [x] F2. Code quality — `uv run ruff check app/` zero new violations
- [x] F3. Full QA — `uv run pytest tests/ --cov` passes, `bash scripts/test.sh` green
- [x] F4. Scope fidelity — confirm no MCP/tool/plugin/frontend changes

## Commit strategy
- Single commit per todo (9 commits) with conventional commit format
- Or squash into 2-3 logical commits: (1) LLM client unification, (2) ARQ wiring, (3) SSE + Langfuse cleanup

## Success criteria
1. `uv run pytest tests/ --cov` — 105+ tests pass, coverage ≥65%
2. `uv run ruff check app/` — zero violations
3. `bash scripts/test.sh` — all 4 stages green
4. No `OllamaClient` class exists (only validate_models function)
5. Memory extraction enqueued as ARQ job
6. Both SSE endpoints use same format
7. runtime.py uses langfuse_utils helpers
