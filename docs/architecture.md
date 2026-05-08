# Application Flow & Data Flow

Mermaid diagrams of the agentic-RAG application, verified against the source. Every node and arrow corresponds to specific code paths listed in the verification section at the bottom.

## 1. System architecture & data flow

```mermaid
flowchart LR
  subgraph BROWSER["Browser - Next.js client"]
    UI["app/page.tsx<br/>(auth + projects + documents + chat)"]
    API["lib/api.ts<br/>apiFetch + API_URL"]
    LS[("localStorage<br/>agentic-rag-token")]
    UI -->|token in/out| LS
    UI -->|REST + SSE| API
  end

  subgraph BACKEND["FastAPI app - src/main.py"]
    CORS["CORSMiddleware"]
    R_HEALTH["/health"]
    R_AUTH["/api/auth<br/>(register, login, me)"]
    R_PROJ["/api/projects"]
    R_DOC["/api/projects/{id}/documents"]
    R_CONV["/api/projects/{id}/conversations"]
    R_CHAT["/api/projects/{id}/chat (SSE)"]

    AUTHDEP["auth/dependencies.get_current_user<br/>+ auth/security (JWT, PBKDF2)"]
    DBDEP["core/database.get_db<br/>(AsyncSession)"]

    R_AUTH --> AUTHDEP
    R_PROJ --> AUTHDEP
    R_DOC --> AUTHDEP
    R_CONV --> AUTHDEP
    R_CHAT --> AUTHDEP

    subgraph REPOS["repositories/"]
      USERS["UserRepository"]
      PROJS["ProjectRepository"]
      DOCS["DocumentRepository<br/>(search_chunks: pgvector cosine)"]
      CONVS["ConversationRepository"]
    end

    subgraph SERVICES["services/"]
      ING["ingestion.py<br/>parse_document_bytes<br/>chunk_text(260/40)<br/>embed_chunks"]
      OLLAMA_C["ollama.OllamaClient<br/>embed() / stream_generate()"]
    end

    subgraph AGENT["agents/rag.py - LangGraph"]
      N1["retrieve<br/>(embed -> cosine top-6)"]
      N2["compose_prompt"]
      N1 --> N2
    end

    R_AUTH --> USERS
    R_PROJ --> PROJS
    R_DOC --> PROJS
    R_DOC --> DOCS
    R_CONV --> PROJS
    R_CONV --> CONVS
    R_CHAT --> PROJS
    R_CHAT --> CONVS
    R_CHAT --> AGENT
    AGENT --> DOCS
    AGENT --> OLLAMA_C
    R_CHAT --> OLLAMA_C
  end

  subgraph WORKER["arq worker - src/workers/arq_worker.py"]
    PD["process_document(doc_id):<br/>status=processing -> parse -> chunk -> embed -> replace_chunks -> completed/failed"]
    PD --> ING
    PD --> DOCS
    PD --> OLLAMA_C
  end

  subgraph DATA["External services"]
    PG[("Postgres + pgvector<br/>users, projects, conversations,<br/>messages, documents, document_chunks(Vector 768))")]
    REDIS[("Redis<br/>arq queue: process_document")]
    OLLAMA[("Ollama<br/>:11434<br/>/api/embeddings, /api/generate")]
  end

  API -->|HTTPS Bearer JWT| CORS
  CORS --> R_HEALTH
  CORS --> R_AUTH
  CORS --> R_PROJ
  CORS --> R_DOC
  CORS --> R_CONV
  CORS --> R_CHAT

  R_DOC -->|create_pool + enqueue_job| REDIS
  REDIS -->|deliver job| PD

  REPOS --> PG
  OLLAMA_C --> OLLAMA
  DBDEP --> PG
```

## 2. Document upload + ingestion (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant U as User (browser)
  participant FE as page.tsx (uploadDocument)
  participant API as POST /api/projects/{id}/documents
  participant PR as ProjectRepository
  participant DR as DocumentRepository
  participant R as Redis (arq)
  participant W as arq_worker.process_document
  participant ING as services/ingestion
  participant OL as OllamaClient.embed
  participant PG as Postgres (documents, document_chunks)

  U->>FE: choose file (input change)
  FE->>API: multipart/form-data + Bearer JWT
  API->>PR: get_for_user(project_id, user_id)
  API->>API: file.read() (bytes)
  API->>DR: create(filename, mime, bytes, sha256, status=pending)
  DR->>PG: INSERT documents
  API->>R: create_pool(redis_url) + enqueue_job("process_document", id)
  API-->>FE: 202 + DocumentRead
  FE->>FE: setInterval 2s -> GET /documents while pending/processing

  R->>W: deliver job
  W->>DR: get(document_id)
  W->>DR: set_status(processing)
  W->>ING: parse_document_bytes (pdf/docx/text)
  W->>ING: chunk_text(260 words / 40 overlap)
  loop per chunk
    W->>OL: POST /api/embeddings (nomic-embed-text)
    OL-->>W: embedding[768]
  end
  W->>DR: replace_chunks (DELETE + INSERT document_chunks)
  W->>DR: set_status(completed | failed)
  DR->>PG: UPDATE documents, INSERT document_chunks (Vector 768)
```

## 3. Chat / RAG streaming (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as page.tsx (sendMessage)
  participant API as POST /api/projects/{id}/chat
  participant PR as ProjectRepository
  participant CR as ConversationRepository
  participant G as agents/rag.prepare_rag_context (LangGraph)
  participant DR as DocumentRepository.search_chunks
  participant OL as OllamaClient
  participant PG as Postgres
  participant OLLAMA as Ollama :11434

  U->>FE: submit question
  FE->>API: JSON {conversation_id?, message} + Bearer JWT
  API->>PR: get_for_user
  alt has conversation_id
    API->>CR: get_for_project
  else
    API->>CR: create(project_id, title=message[:80])
  end
  API->>CR: add_message(role=user, content)
  CR->>PG: INSERT messages

  API-->>FE: StreamingResponse (text/event-stream)
  API-->>FE: event: conversation {id, project_id, title}

  API->>G: ainvoke({project_id, question, ...})
  G->>OL: embed(question) -> /api/embeddings
  OL->>OLLAMA: POST /api/embeddings
  OLLAMA-->>OL: embedding
  G->>DR: search_chunks(project_id, embedding, limit=6)
  DR->>PG: SELECT ... ORDER BY embedding <=> $1 (status='completed')
  PG-->>DR: top-6 (chunk, document, score)
  G->>G: compose_prompt (cited [1]..[N])
  G-->>API: {sources, prompt}

  API-->>FE: event: sources [...]
  API->>OL: stream_generate(prompt)
  OL->>OLLAMA: POST /api/generate stream=true
  loop tokens (NDJSON)
    OLLAMA-->>OL: {response, done}
    OL-->>API: token
    API-->>FE: event: token "<chunk>"
    FE->>FE: append to last assistant message
  end

  API->>CR: add_message(role=assistant, content, metadata={sources})
  CR->>PG: INSERT messages
  API-->>FE: event: final {message_id, content}
  FE->>API: GET /documents and /conversations (refreshProjectData)
```

## Verification — every claim maps to source

- Routers + CORS: `backend/src/main.py:18-34`.
- JWT + PBKDF2: `backend/src/auth/security.py:11-50`; bearer dep `backend/src/auth/dependencies.py:12-32`.
- Frontend token storage + SSE parser: `frontend/app/page.tsx:35,42-53,170,260-295`; streaming endpoint hit at `:245`.
- Document upload enqueue: `backend/src/routers/documents.py:48-68` (uses `arq.create_pool` + `enqueue_job("process_document", ...)`).
- Worker pipeline: `backend/src/workers/arq_worker.py:19-43` (parse -> chunk -> embed -> `replace_chunks` -> `set_status`).
- Ingestion: `backend/src/services/ingestion.py:42-89` (PDF via `pypdf`, DOCX via `ZipFile`+XML, text fallback; `chunk_words=260`, `overlap_words=40`).
- Ollama client paths/models: `backend/src/services/ollama.py:14-47`; defaults `nomic-embed-text` / `qwen2.5:3b` in `backend/src/core/config.py:13-17`.
- LangGraph two-node (retrieve -> compose_prompt): `backend/src/agents/rag.py:25-66`; cosine search with `status="completed"` + `limit=6`: `backend/src/repositories/documents.py:87-101`.
- Vector schema (`Vector(768)` + ivfflat cosine index): `backend/src/domain/models.py:159-173`.
- SSE event names emitted (`conversation`, `sources`, `token`, `final`, `error`): `backend/src/routers/chat.py:56-81` — exactly the names handled by the client at `frontend/app/page.tsx:274-293`.
- Infra (Postgres+pgvector, Redis, Ollama, Langfuse): `docker-compose.yml:2-130`; `infra/init-db.sql:1` (`CREATE EXTENSION vector`).
