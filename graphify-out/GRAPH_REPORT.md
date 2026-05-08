# Graph Report - /Users/suven/Desktop/repo/agentic_rag  (2026-05-07)

## Corpus Check
- 63 files · ~23,719 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 215 nodes · 282 edges · 39 communities detected
- Extraction: 64% EXTRACTED · 36% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` - 22 edges
2. `DocumentRepository` - 18 edges
3. `ProjectRepository` - 14 edges
4. `ConversationRepository` - 12 edges
5. `UserRepository` - 10 edges
6. `get_settings()` - 8 edges
7. `process_document()` - 8 edges
8. `register()` - 7 edges
9. `upload_document()` - 7 edges
10. `chat()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `test_parse_text_document()` --calls--> `parse_document_bytes()`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_ingestion.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/services/ingestion.py
- `test_parse_docx_document()` --calls--> `parse_document_bytes()`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_ingestion.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/services/ingestion.py
- `test_parse_unsupported_document()` --calls--> `parse_document_bytes()`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_ingestion.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/services/ingestion.py
- `register()` --calls--> `TokenResponse`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/src/routers/auth.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/schemas/auth.py
- `login()` --calls--> `TokenResponse`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/src/routers/auth.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/schemas/auth.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (15): Base, chat(), ConversationRepository, _ensure_project(), get_conversation(), list_conversations(), Conversation, Document (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (12): TokenResponse, UserCreate, UserRead, BaseModel, ChatRequest, ConversationDetail, ConversationRead, MessageRead (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (11): login(), register(), get_current_user(), User, create_access_token(), decode_access_token(), hash_password(), verify_password() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (13): BaseSettings, get_settings(), Settings, embed_chunks(), configure_logging(), lifespan(), OllamaClient, build_rag_graph() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (6): process_document(), WorkerSettings, DocumentRepository, _ensure_project(), list_documents(), upload_document()

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (5): apiFetch(), getNetworkErrorMessage(), load(), parseSseEvents(), sendMessage()

### Community 6 - "Community 6"
Cohesion: 0.27
Nodes (9): chunk_text(), parse_document_bytes(), parse_docx_bytes(), sha256_bytes(), test_chunk_text_overlaps(), test_parse_docx_document(), test_parse_text_document(), test_parse_unsupported_document() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (6): Run migrations in 'offline' mode.      This configures the context with just a U, In this scenario we need to create an Engine     and associate a connection with, Run migrations in 'online' mode., run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (1): initial agentic rag schema  Revision ID: 20260507_0001 Revises: Create Date: 202

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Run migrations in 'offline' mode.      This configures the context with just a U

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): In this scenario we need to create an Engine     and associate a connection with

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Run migrations in 'online' mode.

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Agentic RAG

## Knowledge Gaps
- **8 isolated node(s):** `Run migrations in 'offline' mode.      This configures the context with just a U`, `In this scenario we need to create an Engine     and associate a connection with`, `Run migrations in 'online' mode.`, `initial agentic rag schema  Revision ID: 20260507_0001 Revises: Create Date: 202`, `Run migrations in 'offline' mode.      This configures the context with just a U` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `ScrollArea()`, `scroll-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `Badge()`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Separator()`, `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `cn()`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `cn()`, `select.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `cn()`, `textarea.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Input()`, `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `Skeleton()`, `skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `healthcheck()`, `health.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `get_db()`, `database.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `next.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Run migrations in 'offline' mode.      This configures the context with just a U`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `In this scenario we need to create an Engine     and associate a connection with`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Run migrations in 'online' mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Agentic RAG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Why does `DocumentRepository` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `upload_document()` connect `Community 4` to `Community 0`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` (e.g. with `ConversationRepository` and `DocumentRepository`) actually correct?**
  _`Service layer: orchestrates domain logic. No HTTP, no direct ORM.` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `DocumentRepository` (e.g. with `Source` and `RagState`) actually correct?**
  _`DocumentRepository` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `ProjectRepository` (e.g. with `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` and `Project`) actually correct?**
  _`ProjectRepository` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `ConversationRepository` (e.g. with `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` and `Conversation`) actually correct?**
  _`ConversationRepository` has 6 INFERRED edges - model-reasoned connections that need verification._