# 1. Product Requirements Document

**Product:** Artha — local-only RAG engine and AI agent platform for regulated enterprises.
**Rule:** If a feature isn't on this list, it isn't in the build.

## 1. Purpose

Let staff in regulated organisations (finance, legal, healthcare) ask questions of their own
documents and get cited answers, with **zero data leaving their network**. One
`docker compose up` deploys the whole stack.

## 2. Users

| Persona | Goal |
|---------|------|
| **Analyst / knowledge worker** | Upload documents, ask questions, trust the citations. |
| **Finance operator** | Turn bank statements and scanned PDFs into structured data. |
| **Workspace admin** | Choose models, prompts, tools and agents; watch usage and health. |
| **Compliance / security reviewer** | Verify nothing leaves the network and every answer is traceable. |

## 3. Features

Each feature lists who uses it and what "done" means.

### F1. Accounts & authentication
- **Who:** everyone. **Goal:** sign up, sign in, stay signed in, recover access.
- Register, login, token refresh, view/update profile, change password, forgot/reset password.
- **Done when:** passwords stored only as Argon2 hashes; protected routes reject missing or invalid JWTs (401);
  login/register are rate-limited; a user can never read another user's data.

### F2. Projects
- **Who:** analyst. **Goal:** group documents and chats for one matter.
- Create, list, rename, delete projects; optional per-project system prompt; names unique per user.
- **Done when:** deleting a project removes its documents, files, vectors and conversations.

### F3. Document library & ingestion
- **Who:** analyst. **Goal:** get documents searchable.
- Upload (PDF, Office, images, text via MarkItDown/PyMuPDF; OCR via Surya for scans), list with status,
  download original, delete. Duplicate uploads detected by SHA-256.
- Ingestion runs in the background: parse → metadata → caption images → hierarchical chunk → enrich → embed → store.
- **Done when:** upload returns `202` immediately; status moves `pending → processing → completed|failed`;
  failures show a readable `error_message`; a 50-page PDF never blocks the API.

### F4. Project chat (document RAG)
- **Who:** analyst. **Goal:** ask questions grounded in project documents.
- Streaming answers over SSE; citations to source chunks; sources panel; thumbs up/down feedback.
- Pipeline: analyse query → hybrid retrieve → rerank → quality gate → (HyDE retry) → compress → compose → stream.
- **Done when:** answers use only retrieved context; weak evidence yields "I don't know" rather than invention;
  every answer shows its sources; the eval set (50 QA pairs) meets agreed recall/faithfulness targets.

### F5. Individual chat (personal memory)
- **Who:** anyone. **Goal:** general assistant that remembers the user across sessions.
- No documents; LLM plus persistent user memory backed by a Neo4j knowledge graph. Entities extracted from each message in the background.
- **Done when:** a fact stated in one conversation is recalled in a later one; the user can see and delete memories.

### F6. Conversations & history
- Persistent `/chat/<uuid>` URLs that survive refresh; list (paginated), open, rename, delete; command-palette search.
- **Done when:** a pasted conversation URL reopens the same thread for its owner and 404s for anyone else.

### F7. Extract tools
- **Who:** finance operator. **Goal:** text out of PDFs and images, structured.
- PDF→text and image→text extraction; reusable **document templates** (keywords + schema mapping) per project.
- **Done when:** a known template auto-matches a document by keyword and returns structured output.

### F8. Financial workspace
- Parse bank statements into transactions (client-side parser with tests); view and export.
- **Done when:** parsed totals reconcile with the statement for the supported formats listed in the test suite.

### F9. Analytics
- Per-project and per-user usage (documents, messages, latency, feedback).
- **Done when:** figures match the underlying rows and load in under 2 s for a typical workspace.

### F10. Settings & model control
- Profile, appearance (system/light/dark), chat defaults (home tab, scope mode, sidebar).
- LLM config: choose provider/model/temperature/limits; **API keys encrypted at rest (Fernet)**; connection test.
- Workspace registries: models, prompt templates (versioned), tools (none/API key/MCP), agents.
- **Done when:** default is local Ollama; any cloud provider is strictly opt-in and clearly labelled as leaving the network.

### F11. Agents (platform)
- Define agents (workflow definition, prompts, tools); execute via `/api/v1/agents/{workspace}/execute`.
- **Done when:** an agent runs its configured workflow and each step is traced.

### F12. Observability & audit
- Langfuse traces for LLM calls; structured logs; `/health` and `/health/ready`.
- **Done when:** any answer can be traced to its retrieval, rerank scores and model call.

### F13. Security controls
- SSRF guard on all outbound HTTP, rate limiting, JWT validation, network-isolated data services.

## 4. Non-goals (v1)

External OAuth/SSO, Kubernetes deployment, multi-tenant organisations/roles beyond owner,
video generation (removed), full E2E CI with Neo4j + Ollama, mobile apps.

## 5. Success measures

| Metric | Target |
|--------|--------|
| Data egress in default config | 0 bytes (verifiable) |
| Cold deploy to first answer | ≤ 30 min on documented hardware |
| Context recall on 50-pair eval | agreed baseline, no regressions in CI |
| Faithfulness (no unsupported claims) | agreed baseline, no regressions |
| Time to first token | ≤ 3 s on target hardware |

## 6. Open questions

1. Is Neo4j worth its weight? (README proposes an A/B on cross-document questions.)
2. Is the 0.05 reranker gate right for the real corpus? (needs calibration.)
3. Smallest local model that gives acceptable synthesis on target hardware?
4. Is a multi-user/team workspace in scope, or single-owner only?
