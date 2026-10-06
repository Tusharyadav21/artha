# 6. Implementation Plan

What gets built in what order, what each stage delivers, and what you sign off before the next stage starts.
Stages 0–5 are largely **built**; their sign-off is a verification pass. Stages 6–9 are the remaining work.

| Stage | Name | Status |
|-------|------|--------|
| 0 | Foundations | Built — verify |
| 1 | Identity & projects | Built — verify |
| 2 | Ingestion pipeline | Built — verify |
| 3 | RAG chat | Built — verify |
| 4 | Personal memory (Neo4j) | Built — verify |
| 5 | Tools & workspace UI | Built — verify |
| 6 | Docs & spec alignment | To do |
| 7 | Security & data hardening | To do |
| 8 | Quality: evals, tests, observability | To do |
| 9 | Release readiness | To do |

---

### Stage 0 — Foundations
**Delivers:** repo layout, Compose stack, `.env`, nginx gateway, health endpoints, lint/format/test tooling, CI skeleton.
**Sign-off:** `docker compose up -d` brings every service healthy; `/health/ready` is OK; `ruff`, `tsc`, `eslint`, `pytest`, `vitest` run clean.

### Stage 1 — Identity & projects
**Delivers:** register/login/refresh/me/password flows, rate limiting, projects CRUD, sidebar shell, settings profile/appearance.
**Sign-off:** user A cannot read or modify user B's projects (tested); wrong tokens → 401; passwords are Argon2.

### Stage 2 — Ingestion pipeline
**Delivers:** upload → MinIO + Postgres → Celery → parse/OCR → chunk → enrich → embed → Qdrant; status UI; delete cascade.
**Sign-off:** sample set (PDF, scanned PDF, DOCX, image, XLSX) reaches `completed`; a corrupt file reaches `failed` with a message; duplicate upload detected.

### Stage 3 — RAG chat
**Delivers:** LangGraph RAG, hybrid retrieval + rerank + gate + HyDE retry, SSE streaming UI, sources panel, feedback, persistent `/chat/<uuid>`.
**Sign-off:** answers cite sources; unanswerable question returns "I don't know"; refresh keeps the conversation; Langfuse shows the trace.

### Stage 4 — Personal memory
**Delivers:** individual chat, entity extraction to Neo4j, memory recall.
**Sign-off:** fact stated in chat 1 is used in chat 2; memory deletable; graph is user-scoped.

### Stage 5 — Tools & workspace UI
**Delivers:** Extract (PDF/image), templates, Financial parser, Analytics, command palette, models/prompts/tools/agents registries, agent execute endpoint.
**Sign-off:** parser test suite green; template auto-match works; analytics numbers match DB.

### Stage 6 — Docs & spec alignment *(next)*
**Delivers:** `SPEC.md`, README, `.ai/*` updated to this doc set (Qdrant/MinIO/Celery, real routes); stale files removed (`_migrate.py`, root `test_*.py` scripts moved into `tests/`); `src.main` → `app.main` in README.
**Sign-off:** a new engineer follows the README on a clean machine and reaches a working chat with no guesswork.

### Stage 7 — Security & data hardening
**Delivers:** per-user filter enforced on every Qdrant query; explicit Qdrant/MinIO/Neo4j deletion on document/project/account delete (with tests); compose default secrets removed (require override); Langfuse retention/credentials; dependency audit (`pip-audit`, `bandit`); account deletion endpoint; memory list/delete UI.
**Sign-off:** cross-user access test suite passes; deletion leaves no residue in any store; no default credentials in a production profile. **Do not proceed without this.**

### Stage 8 — Quality: evals, tests, observability
**Delivers:** 50-pair eval set run in CI (context recall, faithfulness, latency); calibrated reranker threshold; OpenTelemetry spans for parse/chunk/retrieve/rerank/generate; Neo4j A/B decision; smallest-acceptable-model benchmark; integration tests with Ollama stubbed.
**Sign-off:** baseline metrics recorded and agreed; CI fails on regression.

### Stage 9 — Release readiness
**Delivers:** hardware requirements doc, backup/restore runbook, upgrade/migration procedure, air-gap install guide (pre-pulled images and models), accessibility audit (WCAG AA), load test of ingestion and chat.
**Sign-off:** clean air-gapped install from the runbook; restore drill succeeds; zero outbound traffic verified with default config.

---

## Working rules

- One stage open at a time; each ends with a demo and a written yes/no.
- A change to anything in documents 1–5 is edited in the document first, then built.
- Every stage includes tests for what it adds; no stage is "nearly done" — it passes its sign-off or it doesn't.

## Risks

| Risk | Mitigation |
|------|-----------|
| Local model quality too low for synthesis | Stage 8 model benchmark; larger model option |
| Ingestion slow with enrichment | Measure; make enrichment optional |
| Data left in secondary stores after delete | Stage 7 deletion tests |
| Doc drift returns | Stage 6 + docs reviewed in each PR |
