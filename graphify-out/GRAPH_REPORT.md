# Graph Report - agentic_rag  (2026-05-25)

## Corpus Check
- 126 files · ~89,651 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1431 nodes · 2481 edges · 143 communities (121 shown, 22 thin omitted)
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 666 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b197ef93`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 140|Community 140]]

## God Nodes (most connected - your core abstractions)
1. `User` - 77 edges
2. `OllamaClient` - 40 edges
3. `UserRepository` - 35 edges
4. `cn()` - 29 edges
5. `MessageRole` - 29 edges
6. `DocumentStatus` - 29 edges
7. `Service layer: orchestrates domain logic. No HTTP, no direct ORM.` - 23 edges
8. `VideoGenService` - 21 edges
9. `DocumentRepository` - 21 edges
10. `MessageRepository` - 19 edges

## Surprising Connections (you probably didn't know these)
- `int` --uses--> `User`  [INFERRED]
  backend/src/routers/conversations.py → backend/src/domain/models.py
- `AsyncSession` --uses--> `Project`  [INFERRED]
  backend/src/repositories/projects.py → backend/src/domain/models.py
- `str` --uses--> `Project`  [INFERRED]
  backend/src/repositories/projects.py → backend/src/domain/models.py
- `str` --uses--> `DocumentStatus`  [INFERRED]
  backend/src/workers/arq_worker.py → backend/src/domain/models.py
- `float` --uses--> `OllamaClient`  [INFERRED]
  backend/src/services/ingestion.py → backend/src/services/ollama.py

## Communities (143 total, 22 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (8): chat(), post_message_feedback(), MessageRepository, create_project(), delete_project(), list_projects(), ProjectRepository, update_project()

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (5): UserCreate, UserRead, UserUpdate, Service layer: orchestrates domain logic. No HTTP, no direct ORM., test_user_update_normalizes_blank_display_name()

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (8): embed_chunks(), chunks: list of (child_content, parent_content) from chunk_text_hierarchical., OllamaClient, Stream LLM response with retry logic., Get or create httpx client with connection pooling., Make HTTP request with exponential backoff retry., Generate embedding with retry logic., Generate non-streaming LLM completion with retry logic.

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (12): login(), register(), TokenResponse, update_me(), get_current_user(), create_access_token(), decode_access_token(), hash_password() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (13): BaseSettings, get_settings(), Settings, check_database(), check_ollama(), check_redis(), Check database connection., Check Redis connection. (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): Source, Project, build_rag_graph(), _classify_query_complexity(), _format_history(), prepare_rag_context(), RagState, Return chunk limit (3 / 5 / 6) based on how many docs the query likely needs. (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (15): process_document(), WorkerSettings, DocumentRead, DocumentRepository, _ensure_project(), list_documents(), PaginatedDocuments, Perform hybrid search (Vector + Keyword) using Reciprocal Rank Fusion (RRF). (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (11): chunk_text(), chunk_text_hierarchical(), parse_document_bytes(), parse_docx_bytes(), Returns (child_chunk, parent_chunk) pairs.     Child chunks (~60 words) are embe, sha256_bytes(), test_chunk_text_overlaps(), test_parse_docx_document() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): Run migrations in 'offline' mode.      This configures the context with just a U, In this scenario we need to create an Engine     and associate a connection with, Run migrations in 'online' mode., run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (10): Base, Conversation, Message, User, build_user(), fake_db(), FakeDb, test_get_me_returns_settings() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.70
Nodes (4): apiFetch(), apiUrl(), getNetworkErrorMessage(), readErrorDetail()

### Community 56 - "Community 56"
Cohesion: 0.07
Nodes (71): alias, get_current_user(), Purpose:         Authenticates the current request and provides the correspondin, create_access_token(), create_reset_token(), decode_access_token(), decode_reset_token(), hash_password() (+63 more)

### Community 57 - "Community 57"
Cohesion: 0.08
Nodes (48): AsyncSession, bool, bytes, float, int, str, UUID, AsyncSession (+40 more)

### Community 58 - "Community 58"
Cohesion: 0.14
Nodes (37): AssembleRequest, AsyncSession, Depends, get_current_user, get_db, str, User, Any (+29 more)

### Community 59 - "Community 59"
Cohesion: 0.05
Nodes (39): dependencies, @base-ui/react, class-variance-authority, clsx, framer-motion, lucide-react, next, next-themes (+31 more)

### Community 60 - "Community 60"
Cohesion: 0.10
Nodes (24): FeedbackRating, StreamEvent, WorkspaceContext, WorkspaceContextValue, MessageItemProps, NavbarProps, DEFAULT_OLLAMA_SETTINGS, FeedbackRating (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.08
Nodes (34): bytes, float, int, str, str, chunk_text(), chunk_text_hierarchical(), embed_chunks() (+26 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (27): AsyncSession, str, UUID, AsyncSession, Depends, get_current_user, get_db, User (+19 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (25): str, Request, Response, bool, str, BaseHTTPMiddleware, configure_logging(), Purpose:         Initializes and configures the system-wide logging infrastructu (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.11
Nodes (23): AsyncSession, int, Message, str, UUID, AsyncSession, Message, str (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.13
Nodes (16): CreateProjectDialog(), CreateProjectDialogProps, SettingsView(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount() (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.23
Nodes (24): Any, AsyncSession, Depends, get_current_user, get_db, Request, str, User (+16 more)

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (24): str, ChatScopeMode, HomeTab, Purpose: Stores user-selected UI theme settings., Purpose: Defines the default landing tab for the user interface., Purpose: Controls the scope of new chat sessions (clear vs remember)., ThemePreference, ChangePasswordRequest (+16 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (13): ChatView(), MessageSkeleton(), NAV_ITEMS, SidebarProps, Tooltip(), TooltipContent(), TooltipTrigger(), containerVariants (+5 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (14): Logo(), AuthDialog(), CTAFooter(), CTAFooterProps, HeroSection(), HeroSectionProps, AISection, FeaturesGrid (+6 more)

### Community 70 - "Community 70"
Cohesion: 0.09
Nodes (21): 1. Never Patch — Refactor Properly, AI Agent Instructions, app/, code:txt (src/), Component Rules, components/shared, components/ui, Core Principles (+13 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 72 - "Community 72"
Cohesion: 0.10
Nodes (20): 🏗️ Architecture, code:mermaid (graph TD), code:bash (./run.sh), code:bash (cp .env.example .env), code:bash (ollama pull qwen2.5:3b), code:bash (docker compose up --build -d), code:bash (docker compose exec backend alembic upgrade head), code:text (.) (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.12
Nodes (15): AsyncClient, float, int, Response, str, close_redis(), get_redis(), Purpose:         Provides a process-wide, lazily initialized async Redis client. (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.10
Nodes (20): AssembleRequest, AssembleResponse, HistoryResponse, Purpose:         Response schema for generated visual assets.      Attributes:, Purpose:         Request schema for assembling audio and visuals into a final vi, Purpose:         Response schema for assembled video assets.      Attributes:, Purpose:         Representation of a single video entry in user history.      At, Purpose:         Response schema for retrieving video history.      Attributes: (+12 more)

### Community 75 - "Community 75"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 76 - "Community 76"
Cohesion: 0.10
Nodes (18): 1. Planning & Architectural Workflows (Planning Mode), 2. Backend (FastAPI + uv) Workflow, 3. Frontend (Next.js + Bun) Workflow, 🛠️ Architecture Constraints, 🐍 Backend (Python / FastAPI) Guidelines, 🔍 Codebase Knowledge Integration (Graphify), code:block1 (.), code:bash (graphify update .) (+10 more)

### Community 77 - "Community 77"
Cohesion: 0.10
Nodes (19): dependencies, lucide-react, remotion, @remotion/cli, @remotion/renderer, shiki, zod, description (+11 more)

### Community 78 - "Community 78"
Cohesion: 0.44
Nodes (18): check_docker(), check_env(), check_ollama(), clean_system(), interactive_menu(), log_error(), log_info(), log_step() (+10 more)

### Community 79 - "Community 79"
Cohesion: 0.19
Nodes (18): build_rag_graph(), _classify_query_complexity(), _format_history(), prepare_rag_context(), RagState, Purpose:         Compresses long conversation history into a concise summary usi, Purpose:         Constructs the LangGraph state machine for the RAG pipeline., Purpose:         Orchestrates the RAG pipeline to generate a final prompt for th (+10 more)

### Community 80 - "Community 80"
Cohesion: 0.11
Nodes (17): 1. Asynchronous by Default, 1. Python 3.12 Standard, 2. Pydantic for Validation, 2. SOLID & OOP Principles, 3. Error Handling, 4. Documentation, AI Agent Instructions, api/ (+9 more)

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (10): DocumentLibraryDialog(), DocumentLibraryDialogProps, Sidebar(), useWorkspace(), WorkspaceProvider(), NewChatDialog(), pageMeta(), themeLabel() (+2 more)

### Community 82 - "Community 82"
Cohesion: 0.13
Nodes (14): Auth Router (`/api/auth`), Backend Router Architecture Diagram, Chat Router (`/api/projects/{id}/chat`), code:mermaid (graph TD), code:block2 (Browser), code:block3 (Browser), Conversations Router (`/api/projects/{id}/conversations`), Data Flow Example: Chat Request (+6 more)

### Community 83 - "Community 83"
Cohesion: 0.13
Nodes (14): code:sql (CREATE EXTENSION IF NOT EXISTS vector;), code:bash (uv sync), code:bash (uv run alembic upgrade head), code:bash (uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --rel), code:bash (uv run arq src.workers.arq_worker.WorkerSettings), 🏗️ Components, Database Setup, 🛠️ Environment Configuration (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.16
Nodes (13): AsyncSession, Base, get_db(), Purpose:         Base class for all SQLAlchemy ORM models.      Responsibilities, Purpose:         Dependency provider for database sessions.      Responsibilitie, datetime, DeclarativeBase, Purpose:         Returns current UTC datetime for consistent timestamping across (+5 more)

### Community 85 - "Community 85"
Cohesion: 0.26
Nodes (13): AsyncSession, Depends, get_current_user, get_db, int, User, UUID, _ensure_project() (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.19
Nodes (9): float, int, str, Purpose:         Map raw logits to a (0, 1) probability range.      Inputs:, Purpose:         Cross-encoder based document reranker to refine semantic search, Purpose:             Rerank a set of documents by relevance to a query., Purpose:             Extract most relevant sentences from a chunk to reduce LLM, Reranker (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.14
Nodes (13): 🔐 Authentication Issues, Cannot login after fresh install, Containers keep restarting, 🐳 Docker Issues, 📄 Document Ingestion Issues, Documents stay in `pending` or `processing` status, Error: `connection refused` to Ollama, Error: `model not found` (+5 more)

### Community 88 - "Community 88"
Cohesion: 0.21
Nodes (7): Navbar(), apiFetch(), apiUrl(), getNetworkErrorMessage(), readErrorDetail(), HistoryItem, VideoCreator()

### Community 89 - "Community 89"
Cohesion: 0.17
Nodes (12): ChatRequest, ConversationDetail, ConversationRead, FeedbackRequest, MessageRead, PaginatedConversations, Purpose:         Schema for user feedback on assistant responses.      Attribute, Purpose:         Sanitized conversation metadata for API responses.      Attribu (+4 more)

### Community 90 - "Community 90"
Cohesion: 0.21
Nodes (8): CodeScene(), CodeSceneProps, ExplainerScene(), ExplainerSceneProps, RemotionRoot(), Scene, ShortVideo(), ShortVideoProps

### Community 91 - "Community 91"
Cohesion: 0.27
Nodes (10): BaseModel, ChatRequest, ConversationDetail, ConversationRead, FeedbackRequest, MessageRead, PaginatedConversations, ProjectCreate (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.18
Nodes (10): 🔨 Build & Quality, code:bash (bun install), code:bash (bun run dev), 🐳 Docker, 🛠️ Environment Configuration, ✨ Features, 📦 Local Development, 🚀 Overview (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.20
Nodes (10): 1. Repository Pattern (Data Access Layer), 2. Hybrid Search with Reciprocal Rank Fusion (RRF), 3. Hierarchical Chunking, 4. LangGraph Agent Orchestration, 5. Async Ingestion via Arq Workers, 6. Service Layer (No HTTP, No Direct ORM), 7. SSE Streaming for Chat, code:python (# Instead of: session.query(Document).filter(...).all()) (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (10): Adding a Database Migration, Adding a New API Endpoint, Adding Frontend Components, code:bash (cd backend), code:bash (cd backend), code:python (from fastapi import APIRouter, Depends), code:python (app.include_router(new_feature.router)), Common Development Tasks (+2 more)

### Community 95 - "Community 95"
Cohesion: 0.20
Nodes (10): Backend Setup & Commands, code:sql (CREATE EXTENSION IF NOT EXISTS vector;), code:bash (cd backend), code:bash (uv run ruff check .                  # Lint), code:bash (cd frontend), code:bash (bun run typecheck                    # TypeScript type check), Development Setup, Frontend Setup & Commands (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.20
Nodes (8): Before You Commit, code:block12 (backend/), code:bash (graphify update .), code:bash (graphify query "How does RRF search work?"), File Structure (High-Level), graphify, Knowledge Graph, Testing Strategy

### Community 97 - "Community 97"
Cohesion: 0.20
Nodes (9): Code of Conduct, Contributing to Agentic RAG, Development Setup, How Can I Contribute?, License, Pull Requests, Reporting Bugs, Style Guides (+1 more)

### Community 98 - "Community 98"
Cohesion: 0.36
Nodes (4): ConversationRepository, _ensure_project(), get_conversation(), list_conversations()

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (8): 📡 1. High-Level Architecture, 📂 2. Document Ingestion Flow, 💬 3. Agentic Chat & Streaming, code:mermaid (flowchart LR), code:mermaid (sequenceDiagram), code:mermaid (sequenceDiagram), ✅ Source Code Mapping (Verification), 🏛️ System Overview

### Community 100 - "Community 100"
Cohesion: 0.29
Nodes (6): Run migrations in 'offline' mode.      This configures the context with just a U, In this scenario we need to create an Engine     and associate a connection with, Run migrations in 'online' mode., run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 101 - "Community 101"
Cohesion: 0.29
Nodes (6): ProjectCreate, ProjectRead, ProjectUpdate, Purpose:         Schema for partial updates to project metadata.      Attributes, Purpose:         Sanitized project representation for API responses.      Attrib, Purpose:         Schema for creating a new project.      Attributes:         nam

### Community 102 - "Community 102"
Cohesion: 0.48
Nodes (6): build_user(), fake_db(), FakeDb, test_get_me_returns_settings(), test_patch_me_rejects_null_preferences(), test_patch_me_updates_partial_settings()

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): AuthDialogProps, TokenResponse, getCookie(), removeCookie(), setCookie()

### Community 104 - "Community 104"
Cohesion: 0.33
Nodes (6): Backend Issues, code:bash (# Check Redis connection), code:bash (# Check migration status), code:bash (bun run typecheck  # Full check), Debugging Tips, Frontend Issues

### Community 106 - "Community 106"
Cohesion: 0.33
Nodes (5): 1. Feature Boundaries, 2. Layers, 3. Dependency Rules, Architecture Guidelines, Feature-Driven Development (FDD)

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (5): 1. Composition Over Props, 2. Small and Focused, 3. Server by Default, code:tsx (<Card>), Component Guidelines

### Community 108 - "Community 108"
Cohesion: 0.33
Nodes (5): Agentic RAG Roadmap 🗺️, 💡 Feature Requests, 🚀 Phase 1: Core Foundation (Current), 🛠️ Phase 2: Enhanced Capabilities (Q2 2026), 🛡️ Phase 3: Enterprise & Scale (Q3 2026)

### Community 109 - "Community 109"
Cohesion: 0.40
Nodes (4): 1. Fetching Strategy, 2. Mutations, 3. Validation, Data Flow and API

### Community 110 - "Community 110"
Cohesion: 0.40
Nodes (4): CSS/Tailwind, Files and Directories, Naming Conventions, Variables and Functions

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (4): Architecture Overview, Core Communities, God Nodes (Core Abstractions), Technology Stack

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): get_langfuse(), Shared Langfuse client — initialised once at module import time.  The client is, Purpose:         Singleton provider for the Langfuse tracing client.      Respon

### Community 113 - "Community 113"
Cohesion: 0.50
Nodes (3): 1. The State Hierarchy, 2. Persistence, State Management

### Community 115 - "Community 115"
Cohesion: 0.50
Nodes (4): Purpose:         Defines the structured sequence of scenes and total duration fo, Purpose:         Response schema for generated video scripts., ScriptResponse, VideoTimeline

## Knowledge Gaps
- **289 isolated node(s):** `config`, `root`, `nextConfig`, `name`, `version` (+284 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 56` to `Community 66`, `Community 102`, `Community 84`, `Community 85`, `Community 57`, `Community 58`, `Community 62`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `OllamaClient` connect `Community 66` to `Community 5`, `Community 73`, `Community 79`, `Community 56`, `Community 58`, `Community 61`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `DocumentRepository` connect `Community 6` to `Community 1`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 73 inferred relationships involving `User` (e.g. with `Base` and `FakeDb`) actually correct?**
  _`User` has 73 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `OllamaClient` (e.g. with `str` and `Any`) actually correct?**
  _`OllamaClient` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `UserRepository` (e.g. with `Request` and `UserCreate`) actually correct?**
  _`UserRepository` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `root`, `nextConfig` to the rest of the system?**
  _477 weakly-connected nodes found - possible documentation gaps or missing edges._