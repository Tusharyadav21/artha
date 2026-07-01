---
slug: three-db-chat
status: drafting
intent: clear
pending-action: write .omo/plans/three-db-chat.md
approach: Neo4j-powered two-chat-type system (project + individual), URL-persisted conversation IDs, simplified two-tier memory (SQL short-term + Neo4j long-term)
---

# Draft: three-db-chat

## Modern Standards Comparison

| Aspect | Artha (current) | Modern Standard | Proposed |
|--------|----------------|-----------------|----------|
| **Vector store** | pgvector ✅ | pgvector / Qdrant / Pinecone | pgvector (keep — no change needed) |
| **Graph DB** | ❌ None | Neo4j / Amazon Neptune | Neo4j (add, as requested) |
| **Structured DB** | PostgreSQL ✅ | PostgreSQL / CockroachDB | PostgreSQL (keep) |
| **Memory tiers** | Fragmented stubs (UserMemory SQL KV + ConversationMemory SQL KV) | Mem0 (2-tier: working memory + graph), MemGPT (3-tier: working/archival/recall) | **2-tier**: Short-term (SQL conversation history) + Long-term (Neo4j entity graph) |
| **Background jobs** | Celery ✅ | Celery / Temporal | Celery (keep) |
| **Entity extraction** | ❌ None | LLM-based NER (used in Mem0, GraphRAG) | LLM-based entity→Neo4j (new) |
| **Chat URL state** | ❌ Lost on refresh | URL-based routing (ChatGPT, Claude all use URL params) | `?cid=` query param (new) |
| **Chat types** | Project-only | Multi-chat (ChatGPT Personal/Projects, Claude Projects) | Project + Individual (new) |

### Key simplification vs initial draft:
1. **Dropped Redis working memory tier** — conversation history in SQL serves as short-term memory; graph (Neo4j) serves as long-term. Redis stays only for Celery job queue. Saves one integration point.
2. **ConversationMemory table kept but NOT used for memory extraction** — existing schema stays, but new memory flows go through Neo4j. No migration needed to `conversation_memories`.
3. **Entity extraction per-message but lightweight** — only extract when message has declarative content (facts, preferences), skip questions and chitchat. Single LLM call, no sub-graph traversals.
4. **Graph context injection simplified** — just inject relevant entity text (user memories + project entities) as a paragraph in the prompt. No complex subgraph rendering.
5. **Neo4j adds a Docker service but removes complex PostgreSQL recursive queries** — graph operations use Cypher, which is simpler and faster for entity traversal than PostgreSQL recursive CTEs.

## Components (topology ledger)
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| C1 | Project chat with document + Neo4j context | active | `backend/app/routes/chat.py`, `backend/app/services/agents/rag.py` |
| C2 | Individual chat without project context | active | New — no existing impl |
| C3 | Chat ID in URL, persisted on refresh | active | `frontend/app/(workspace)/chat/page.tsx` — no conversation ID in URL |
| C4 | PostgreSQL for structured data | active | All existing models (`backend/app/domain/models.py`) |
| C5 | pgvector for document embeddings | active | `DocumentChunk.embedding` with IVFFlat index |
| C6 | **Neo4j** for long-term entity knowledge graph | new | No GraphDB exists today; `graph_context` is a placeholder in `RagState` |
| C7 | 2-tier memory: short-term (conversation history) + long-term (Neo4j graph) | new | `MemoryManager` in `interfaces.py` defines contract; impl is stub |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| Individual chat stored in existing `conversations` table, nullable `project_id` | Single table approach | Simpler migration; no new table; query filters `WHERE project_id IS NULL` | Moderate |
| Neo4j connection via single `neo4j` Python driver | Official `neo4j` package with async support | Mature, well-documented, supports Bolt protocol | Yes |
| Entity extraction per-message (not batch) | Most practical for chat UX | Real-time memory per conversation; can batch later | Yes — switch to hourly batch |
| Long-term memory = Neo4j entities only (no vector embeddings for entities) | Simpler; entities found by name match + Cypher traversal | Entity vector search adds complexity with limited benefit for user memory context | Yes — add entity embeddings later |

## Findings (cited - path:lines)
1. **All chats scoped to project today**: `Conversation.project_id` is FK NOT NULL (`backend/app/models/conversation.py:23-27`). Individual chat requires nullable project_id.
2. **Chat endpoint is project-scoped**: `POST /api/projects/{project_id}/chat` (`backend/app/routes/chat.py:25-31`). Individual chat needs separate endpoint.
3. **No conversation ID in chat URL**: Chat route is `/chat` only (`frontend/app/(workspace)/chat/page.tsx`). `ChatView` reads `searchParams` only for `?search=`.
4. **`useChat` manages `activeConversationId` in React state only**: `frontend/hooks/use-chat.tsx:64`. No URL sync.
5. **RAG pipeline has graph_context placeholder**: `RagState.graph_context` and `query_entities` in `backend/app/services/agents/rag.py:55-56` — exist but empty. `compose_prompt` already allocates 15% budget to graph context (lines 298-313).
6. **Celery already wired**: `compose.yaml:110` uses Celery worker command; `backend/app/utils/celery_app.py` exists.
7. **Memory layer is fragmented**: `UserMemory` (SQL), `ConversationMemory` (SQL), `MemoryManager` stub — no unified long-term store.
8. **Docker Compose has pattern for adding services**: postgres, redis, langfuse, qdrant, minio, api, worker, frontend, nginx — adding Neo4j follows same pattern.
9. **ChatScopeMode enum exists**: `CLEAR`, `REMEMBER`, `ALL_COMPLETED` (`backend/app/models/enums.py:31-34`).

## Decisions (with rationale)
1. **Neo4j for GraphDB** (per user request): Add Neo4j Docker container. Official `neo4j` Python driver. Cypher queries for entity CRUD and traversal. Better than PostgreSQL adjacency for depth>1 relationship queries.
2. **Two chat types**: Current `POST /api/projects/{project_id}/chat` stays for project chats (documents + Neo4j context). New `POST /api/chat` for individual chats (LLM + history + Neo4j user memory).
3. **Conversation ID in URL**: Use `/chat?cid={id}` query param. `router.replace()` on create/switch — no visible refresh, no layout remount.
4. **2-tier memory (simplified)**: Short-term = conversation messages from PostgreSQL. Long-term = Neo4j entity graph. Redis stays for Celery queue only. Drops the 3-tier complexity.
5. **Entity extraction via Celery**: After each user message with declarative content, enqueue a Celery task that calls LLM for entity extraction → stores in Neo4j.
6. **Frontend unified view with Codex-style selector**: Same UI for both chat types. Project selector at bottom (below input). "Individual Chat" option in selector.

## Scope IN
- Neo4j Docker container in compose.yaml
- Neo4j driver + `GraphRepository` with Cypher CRUD
- `POST /api/chat` individual chat endpoint
- Nullable `Conversation.project_id` for individual chats
- `Conversation.user_id` FK for ownership when project_id is null
- Chat URL with `?cid=` persisted via `router.replace()`
- Entity extraction Celery task (LLM → Neo4j)
- Graph context injection in RAG pipeline (`RagState.graph_context`)
- 2-tier MemoryManager: short-term (SQL conversation history) + long-term (Neo4j)
- Frontend Codex-style project selector at chat input bottom
- Sidebar showing both chat types with type badge

## Scope OUT (Must NOT have)
- No Qdrant integration (deferred)
- No Redis working memory tier (dropped for simplicity)
- No entity vector embeddings (text-only entity search via Cypher for now)
- No breaking changes to existing project chat behavior or routes
- No changes to document ingestion pipeline
- No collaborative/multi-user features
- No changes to auth model

## Resolved questions
| # | question | decision | rationale |
| --- | --- | --- | --- |
| 1 | Individual chat storage | Nullable `project_id` on existing `conversations` table | Single table, simpler migration |
| 2 | Entity extraction timing | Async via Celery (not real-time) | Chat latency unaffected; Celery already wired |
| 3 | Frontend UX | Unified view with Codex-style project selector at bottom | Same layout for both; selector like Codex |
| 4 | GraphDB technology | Neo4j (requested) | Purpose-built for entity graphs; Cypher > recursive CTEs |
| 5 | Memory tiers | 2-tier: short-term (SQL) + long-term (Neo4j), no Redis working tier | Simpler; Redis unnecessary for single-user local app |

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
