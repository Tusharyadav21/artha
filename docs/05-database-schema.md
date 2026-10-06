# 5. Database Schema & Data Access

**The one never to skip.** What is stored, where it lives, and who can see each part. Derived from `backend/app/models/*` and Alembic migrations.

## 1. Where data lives

| Store | Holds | Sensitivity |
|-------|-------|-------------|
| **PostgreSQL** | Users, projects, documents (metadata), conversations, messages, config, workspace registries | High |
| **Qdrant** | Chunk text + 1024-d embeddings, tagged by project/document | High (contains document content) |
| **MinIO** | Original uploaded files | High |
| **Neo4j** | Per-user entities and relations extracted from chat | High (personal data) |
| **Redis** | Job queue, cache, events (transient) | Medium — no long-term data |
| **Langfuse DB** | Prompts/completions in traces | High — treat as customer data |

## 2. Postgres tables

All PKs are UUID; `created_at/updated_at` timestamptz unless noted.

### Identity
**users** — `email` (unique, ≤320), `hashed_password` (Argon2), `display_name`, `theme_preference` (system|light|dark), `default_home_tab` (chat|library|settings), `sidebar_collapsed`, `new_chat_scope_mode` (clear|remember|all-completed).
**user_memories** — `user_id`→users (cascade), `content`.
**user_llm_configs** — `user_id` unique→users, `provider` (openai|anthropic|groq|gemini|mistral|together|cohere|ollama), **`api_key_encrypted` (Fernet bytes)**, `model`, `temperature`, `max_tokens`, `max_retries`, `base_delay_s`, `timeout_s`, `extra_params` (JSONB).

### Work
**projects** — `user_id`→users (cascade), `name`, `system_prompt`; **unique (user_id, name)**.
**documents** — `project_id`→projects (cascade), `filename`, `mime_type`, `minio_object_name`, `file_size`, `content_sha256` (indexed), `status` (pending|processing|completed|failed), `error_message`, `extracted_metadata` (JSONB), `processed_at`, `ingestion_version`; index (project_id, status).
**document_templates** — `project_id`→projects (cascade), `name`, `keywords` (JSONB list), `schema_mapping` (JSONB).
**conversations** — `project_id`→projects (nullable = individual chat), `user_id`→users (cascade), `title`.
**messages** — `conversation_id`→conversations (cascade), `role` (user|assistant|system), `content`, `metadata` (JSONB: sources, scores, feedback), `created_at`; index (conversation_id, created_at).
**conversation_memories** — `conversation_id`→conversations, `key`, `value` (JSONB); unique (conversation_id, key).

### Workspace platform
**workspaces** — `name`, `owner_id`→users.
**model_registry** — `workspace_id`, `name`, `provider`, `model_name`, `base_url`, `context_window`, `supports_tools`, `is_active`.
**prompt_templates** — `workspace_id`, `name`, `version`, `template_text`, `model_id`→model_registry, `temperature`, `is_active`; unique (workspace_id, name, version).
**tools** — `workspace_id`, `name`, `description`, `endpoint_url`, `auth_type` (none|api_key|mcp), `is_active`; unique (workspace_id, name).
**agents** — `workspace_id`, `name`, `description`, `routing_description`, `workflow_definition` (JSONB), `version`, `is_active`, `created_by`→users; unique (workspace_id, name, version).
**agent_prompts** (agent_id, prompt_id, role ∈ system|user|assistant), **agent_tools** (agent_id, tool_id), **agent_memories** (`workspace_id`, `agent_id`, `content`, `metadata`, `source`).

### Relationships
```
users 1─* projects 1─* documents
users 1─* projects 1─* document_templates
users 1─* conversations *─1 projects (nullable)
conversations 1─* messages, conversations 1─* conversation_memories
users 1─1 user_llm_configs, users 1─* user_memories
users 1─* workspaces 1─* {model_registry, prompt_templates, tools, agents, agent_memories}
```

## 3. Non-relational layout

- **Qdrant:** one collection of 1024-d cosine vectors; payload = `document_id`, `project_id`, `user_id`, chunk/parent index, text, parent context, hypothetical questions, summary. **Every query must filter by `user_id`/`project_id`.**
- **MinIO:** object key per document; bucket not public; downloads only through `GET …/documents/{id}/file` after an ownership check.
- **Neo4j:** nodes/relations scoped by `user_id`; no cross-user traversal.

## 4. Who can see what

| Data | Owner (user) | Other users | Admin | Services |
|------|--------------|-------------|-------|----------|
| Own projects, documents, files, vectors | read/write/delete | **none** | none by default | API, workers |
| Conversations & messages | read/write/delete | **none** | none | API |
| Graph memory | read/delete | **none** | none | worker |
| LLM API key | write; never returned (only a "configured" flag) | none | none | API decrypts only when calling provider |
| Password | never readable (hash only) | none | none | auth |
| Workspace registries | owner of workspace | none | — | API |
| Traces (Langfuse) | — | — | Langfuse admin only | LLM client |

Access rule, enforced in repositories and tested: **every query is scoped by the authenticated `user_id` (directly or through project/conversation ownership)**; mismatches return 404, not 403, so ids can't be probed.

## 5. Retention & deletion

| Action | Must remove |
|--------|-------------|
| Delete document | Postgres row, MinIO object, Qdrant points |
| Delete project | Its documents (as above), templates, conversations, messages |
| Delete conversation | Messages, conversation memories |
| Delete account | All of the above + user memories, LLM config, workspace data, Neo4j subgraph |
| Delete memory item | Postgres/graph entry |

Cascade deletes cover Postgres; **Qdrant, MinIO and Neo4j cleanup must be explicit service calls and need tests** (current gap).

## 6. Security controls on data

- Passwords Argon2; API keys Fernet (key from env); JWT secret ≥ 32 chars.
- Never log document text, prompts, tokens or keys; log ids only.
- Postgres/Qdrant/MinIO/Neo4j not exposed beyond the host in production; credentials changed from compose defaults.
- Backups: Postgres + Qdrant + MinIO + Neo4j snapshots together (they must stay consistent); encrypt backups.
- Langfuse stores prompt content — restrict its login and set retention.

## 7. Migration policy

Alembic only; one migration per change; reversible where possible; applied by `alembic upgrade head` on deploy. Existing: initial clean migration, nullable `project_id` + `user_id` on conversations, remove `source_bytes`.

## 8. Open gaps

1. `.ai/database.md` still describes pgvector chunks and videos — update.
2. Verify Qdrant payload filtering by user on all search paths.
3. Add explicit deletion tests across Qdrant/MinIO/Neo4j.
4. Decide if roles/teams are needed; today access is owner-only.
