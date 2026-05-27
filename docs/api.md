# FastAPI Web API Specifications & Contracts

This document maps all REST and Streaming endpoints of **Agentic RAG**.

---

## 🔐 1. Auth Router (`/api/auth`)

Enforces secure account creation, JWT issuance, and profile changes.

* **POST `/register`**
  - **Auth**: None
  - **Rate Limit**: 5/min
  - **Input Model**: `UserCreate` (`email`, `password`, `full_name`)
  - **Output Model**: `TokenResponse` (`access_token`, `token_type="bearer"`, `user`: `UserRead`)
* **POST `/login`**
  - **Auth**: None
  - **Rate Limit**: 10/min
  - **Input Model**: `UserLogin` (`email`, `password`)
  - **Output Model**: `TokenResponse`
* **GET `/me`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `UserRead` (`id`, `email`, `full_name`, `created_at`)
* **PATCH `/me`**
  - **Auth**: Bearer JWT Required
  - **Input Model**: `UserUpdate` (`full_name`, `password`)
  - **Output Model**: `UserRead`

---

## 📁 2. Projects Router (`/api/projects`)

Scopes data records per authenticated user container workspace.

* **GET `/`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `List[ProjectRead]`
* **POST `/`**
  - **Auth**: Bearer JWT Required
  - **Input Model**: `ProjectCreate` (`name`, `system_prompt`)
  - **Output Model**: `ProjectRead` (`id`, `name`, `system_prompt`, `created_at`)
* **PATCH `/{id}`**
  - **Auth**: Bearer JWT Required
  - **Input Model**: `ProjectUpdate` (`name`, `system_prompt`)
  - **Output Model**: `ProjectRead`
* **DELETE `/{id}`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `SimpleMessageResponse` (`status="success"`)

---

## 📄 3. Documents Router (`/api/projects/{id}/documents`)

Asynchronous upload parsing triggers background workers.

* **GET `/`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `List[DocumentRead]`
* **POST `/`**
  - **Auth**: Bearer JWT Required
  - **Input**: `Multipart/form-data` containing `file`
  - **Response Status**: `202 Accepted`
  - **Output Model**: `DocumentRead` (`id`, `filename`, `mime_type`, `status="pending"`)

---

## 💬 4. Conversations & SSE Chat Router

* **GET `/api/projects/{id}/conversations`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `List[ConversationRead]`
* **GET `/api/projects/{id}/conversations/{conv_id}`**
  - **Auth**: Bearer JWT Required
  - **Output Model**: `ConversationDetailedRead` (includes all past message roles and contents)
* **POST `/api/projects/{id}/chat`**
  - **Auth**: Bearer JWT Required
  - **Rate Limit**: 20/min
  - **Input Model**: `ChatRequest` (`conversation_id: UUID | None`, `message: str`)
  - **Response Headers**: `Content-Type: text/event-stream`

### Server-Sent Events (SSE) Protocol Specifications
Each chunk emitted is structured in standard NDJSON schema:
* `event: conversation` -> `{"id": UUID, "title": str}` (emitted immediately)
* `event: sources` -> `[{"id": UUID, "filename": str, "content": str, "score": float}]` (citation chunks)
* `event: token` -> `"<chunk>"` (emitted as soon as Ollama returns generated tokens)
* `event: final` -> `{"message_id": UUID, "content": str}` (returns stored message ID)
* `event: error` -> `{"detail": "error message", "code": "ERR_CODE"}`

---

## 🎬 5. Video Router (`/api/video`)

Coordinates technical YouTube Short synthesis tasks.

* **POST `/script`**
  - **Input Model**: `ScriptGenerateRequest` (`topic: str`)
  - **Output Model**: `ScriptTimeline` (timings, scenes narration, camera focus)
* **POST `/voice`**
  - **Input Model**: `VoiceSynthesizeRequest` (`text: str`, `voice: str`)
  - **Output Model**: `VoiceFileResponse` (`audio_url: str`, `duration: float`)
* **POST `/visuals`**
  - **Input Model**: `CodeRenderRequest` (`code: str`, `language: str`)
  - **Output Model**: `CodeRenderResponse` (`image_url: str`)
* **POST `/finalize`**
  - **Input Model**: `VideoAssembleRequest` (`timeline: dict`, `output_name: str`)
  - **Response Status**: `202 Accepted`
  - **Output Model**: `VideoAssembleResponse` (`video_url: str`, `status="rendering"`)
