# Graph Report - /Users/suven/Desktop/repo/agentic_rag  (2026-05-12)

## Corpus Check
- 86 files · ~59,002 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 326 nodes · 448 edges · 56 communities detected
- Extraction: 65% EXTRACTED · 35% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.7)
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]

## God Nodes (most connected - your core abstractions)
1. `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` - 23 edges
2. `DocumentRepository` - 21 edges
3. `ProjectRepository` - 18 edges
4. `ConversationRepository` - 16 edges
5. `OllamaClient` - 16 edges
6. `UserRepository` - 12 edges
7. `upload_document()` - 9 edges
8. `chat()` - 9 edges
9. `get_settings()` - 9 edges
10. `process_document()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `WorkerSettings` --uses--> `DocumentRepository`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/src/workers/arq_worker.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/repositories/documents.py
- `FakeDb` --uses--> `User`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_auth_api.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/domain/models.py
- `build_user()` --calls--> `User`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_auth_api.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/domain/models.py
- `test_parse_text_document()` --calls--> `parse_document_bytes()`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_ingestion.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/services/ingestion.py
- `test_parse_docx_document()` --calls--> `parse_document_bytes()`  [INFERRED]
  /Users/suven/Desktop/repo/agentic_rag/backend/tests/test_ingestion.py → /Users/suven/Desktop/repo/agentic_rag/backend/src/services/ingestion.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (19): Base, chat(), post_message_feedback(), ConversationRepository, _ensure_project(), get_conversation(), list_conversations(), Perform hybrid search (Vector + Keyword) using Reciprocal Rank Fusion (RRF). (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (15): UserCreate, UserRead, UserUpdate, BaseModel, ChatRequest, ConversationDetail, ConversationRead, FeedbackRequest (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (15): process_document(), WorkerSettings, BaseHTTPMiddleware, chunk_text_hierarchical(), embed_chunks(), chunks: list of (child_content, parent_content) from chunk_text_hierarchical., Returns (child_chunk, parent_chunk) pairs.     Child chunks (~60 words) are embe, RequestTracingMiddleware (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (13): login(), register(), TokenResponse, update_me(), get_current_user(), User, create_access_token(), decode_access_token() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (13): BaseSettings, get_settings(), Settings, check_database(), check_ollama(), check_redis(), Check database connection., Check Redis connection. (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (13): Project, build_rag_graph(), _classify_query_complexity(), _format_history(), prepare_rag_context(), RagState, Return chunk limit (3 / 5 / 6) based on how many docs the query likely needs., Source (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (8): DocumentRead, DocumentRepository, _ensure_project(), list_documents(), PaginatedDocuments, Validate uploaded file size and type., upload_document(), _validate_upload_file()

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (9): chunk_text(), parse_document_bytes(), parse_docx_bytes(), sha256_bytes(), test_chunk_text_overlaps(), test_parse_docx_document(), test_parse_text_document(), test_parse_unsupported_document() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (2): SettingsView(), useWorkspace()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): Run migrations in 'offline' mode.      This configures the context with just a U, In this scenario we need to create an Engine     and associate a connection with, Run migrations in 'online' mode., run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.48
Nodes (6): build_user(), fake_db(), FakeDb, test_get_me_returns_settings(), test_patch_me_rejects_null_preferences(), test_patch_me_updates_partial_settings()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.7
Nodes (4): apiFetch(), apiUrl(), getNetworkErrorMessage(), readErrorDetail()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (1): initial agentic rag schema  Revision ID: 20260507_0001 Revises: Create Date: 202

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (1): add project system prompt  Revision ID: 20260509_0002 Revises: 20260507_0001 Cre

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): add user settings  Revision ID: 20260512_0003 Revises: 20260509_0002 Create Date

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.67
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
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Validate that required environment variables are set.

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **19 isolated node(s):** `Run migrations in 'offline' mode.      This configures the context with just a U`, `In this scenario we need to create an Engine     and associate a connection with`, `Run migrations in 'online' mode.`, `initial agentic rag schema  Revision ID: 20260507_0001 Revises: Create Date: 202`, `add project system prompt  Revision ID: 20260509_0002 Revises: 20260507_0001 Cre` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `Page()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `WorkspaceLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `SettingsPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `ChatPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `LibraryPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `AuthPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `ScrollArea()`, `scroll-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Badge()`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `Separator()`, `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `cn()`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `cn()`, `select.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `cn()`, `textarea.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `Input()`, `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `Skeleton()`, `skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `handleSubmit()`, `chat-view.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `statusVariant()`, `library-view.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `AuthScreen()`, `auth-screen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `RootRedirect()`, `root-redirect.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `configure_test_settings()`, `conftest.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `get_db()`, `database.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `next.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `app-storage.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Validate that required environment variables are set.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `rate_limit.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` connect `Community 1` to `Community 0`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `DocumentRepository` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `ConversationRepository` connect `Community 0` to `Community 1`, `Community 5`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` (e.g. with `ConversationRepository` and `DocumentRepository`) actually correct?**
  _`Service layer: orchestrates domain logic. No HTTP, no direct ORM.` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `DocumentRepository` (e.g. with `Validate uploaded file size and type.` and `Source`) actually correct?**
  _`DocumentRepository` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `ProjectRepository` (e.g. with `Validate uploaded file size and type.` and `Service layer: orchestrates domain logic. No HTTP, no direct ORM.`) actually correct?**
  _`ProjectRepository` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `ConversationRepository` (e.g. with `Source` and `RagState`) actually correct?**
  _`ConversationRepository` has 10 INFERRED edges - model-reasoned connections that need verification._