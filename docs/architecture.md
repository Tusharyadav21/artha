# System Architecture & Technical Design

This document details the high-level system design, relational database models, and critical sequence flows of **Agentic RAG**.

---

## 🏛️ 1. High-Level Architecture

Agentic RAG is organized as a local-first distributed system.

```mermaid
flowchart LR
  subgraph BROWSER["Browser - Next.js client"]
    UI["app/page.tsx<br/>(auth + workspace + chat)"]
    API["lib/api.ts<br/>apiFetch + API_URL"]
    LS[("localStorage<br/>token")]
    UI -->|token| LS
    UI -->|REST + SSE| API
  end

  subgraph BACKEND["FastAPI app - src/main.py"]
    CORS["CORSMiddleware"]
    R_HEALTH["/health"]
    R_AUTH["/api/auth"]
    R_PROJ["/api/projects"]
    R_DOC["/api/projects/{id}/documents"]
    R_CHAT["/api/projects/{id}/chat"]
    R_VIDEO["/api/video"]

    AUTHDEP["auth/dependencies.get_current_user"]
    DBDEP["core/database.get_db"]

    R_AUTH --> AUTHDEP
    R_PROJ --> AUTHDEP
    R_DOC --> AUTHDEP
    R_CHAT --> AUTHDEP
    R_VIDEO --> AUTHDEP

    subgraph REPOS["repositories/"]
      USERS["UserRepository"]
      PROJS["ProjectRepository"]
      DOCS["DocumentRepository"]
      CONVS["ConversationRepository"]
    end

    subgraph SERVICES["services/"]
      ING["ingestion.py"]
      OLLAMA_C["ollama.OllamaClient"]
      VID["video_gen.py"]
    end

    subgraph AGENT["agents/rag.py - LangGraph"]
      N1["retrieve"]
      N2["compose_prompt"]
      N1 --> N2
    end

    R_AUTH --> USERS
    R_PROJ --> PROJS
    R_DOC --> DOCS
    R_CHAT --> AGENT
    AGENT --> DOCS
    AGENT --> OLLAMA_C
    R_VIDEO --> VID
  end

  subgraph WORKER["arq worker - src/workers/arq_worker.py"]
    PD["process_document"]
    PD --> ING
    PD --> DOCS
  end

  subgraph DATA["External services"]
    PG[("Postgres + pgvector")]
    REDIS[("Redis")]
    OLLAMA[("Ollama")]
  end

  API -->|HTTPS Bearer JWT| CORS
  R_DOC -->|enqueue_job| REDIS
  REDIS -->|deliver job| PD
  REPOS --> PG
  OLLAMA_C --> OLLAMA
  DBDEP --> PG
```

---

## 🗄️ 2. Database Models & Schema Entities

Refer to [docs/database.md](database.md) for full SQLAlchemy schema models and relationships:
* **User**: PBKDF2 hashed credentials, JWT session validation.
* **Project**: Dynamic scoping container for files and chats.
* **Document & DocumentChunk**: Hierarchical parent-child embeddings storage using 768-dimensional `nomic-embed-text` vectors in `pgvector`.
* **Conversation & Message**: Persistent session history storage.

---

## 📡 3. REST & SSE Endpoint Routes

Refer to [docs/api.md](api.md) for detailed descriptions of all FastAPI APIRouter endpoints:
* **/api/auth**: Registration, secure authentication, and profile settings.
* **/api/projects**: Dynamic workspaces scoping per authenticated user session.
* **/api/projects/{id}/documents**: Multi-format async file uploads and processing updates.
* **/api/projects/{id}/chat**: Real-time SSE streaming RAG responses.
* **/api/video**: Remotion-based short-form video generation timeline.

---

## ⚡ 4. Asynchronous Document Ingestion Sequence

Uploads are non-blocking; the API saves metadata, enqueues the job to Arq, and returns immediate acknowledgment.

```mermaid
sequenceDiagram
  autonumber
  participant U as User (browser)
  participant FE as page.tsx
  participant API as POST /api/projects/{id}/documents
  participant DR as DocumentRepository
  participant R as Redis (arq)
  participant W as arq_worker.process_document
  participant ING as services/ingestion
  participant OL as OllamaClient
  participant PG as Postgres

  U->>FE: choose file
  FE->>API: multipart/form-data + Bearer JWT
  API->>DR: create(status=pending)
  DR->>PG: INSERT documents
  API->>R: enqueue_job("process_document", id)
  API-->>FE: 202 + DocumentRead
  FE->>FE: Poll GET /documents (status checks)

  R->>W: deliver job
  W->>DR: set_status(processing)
  W->>ING: parse_document_bytes
  W->>ING: chunk_text(260 words / 40 overlap)
  loop per chunk
    W->>OL: embed(chunk)
    OL-->>W: embedding[768]
  end
  W->>DR: replace_chunks
  W->>DR: set_status(completed | failed)
  DR->>PG: INSERT document_chunks
```

---

## 💬 5. SSE Chat Generation Sequence

LangGraph orchestrates candidate retrieval, quality gates, and citations before streaming response tokens.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as page.tsx
  participant API as POST /api/projects/{id}/chat
  participant CR as ConversationRepository
  participant G as agents/rag.prepare_rag_context (LangGraph)
  participant DR as DocumentRepository
  participant OL as OllamaClient

  U->>FE: submit question
  FE->>API: POST /chat + Bearer JWT
  API->>CR: add_message(role=user)
  API-->>FE: StreamingResponse (text/event-stream)

  API->>G: ainvoke({question})
  G->>OL: embed(question)
  G->>DR: search_chunks(embedding, limit=6)
  G->>G: compose_prompt (cited [1]..[N])
  G-->>API: {sources, prompt}

  API-->>FE: event: sources [...]
  API->>OL: stream_generate(prompt)
  loop tokens
    OL-->>API: token chunk
    API-->>FE: event: token "text"
  end
  API->>CR: add_message(role=assistant)
  API-->>FE: event: final
```
