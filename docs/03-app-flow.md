# 3. App Flow

Every screen, every click, and what comes after it — including where someone lands when something goes wrong.

## 1. Route map

| Route | Screen | Auth | Purpose |
|-------|--------|------|---------|
| `/` | Landing | public | Marketing, sign-in/up dialog |
| `/auth` | Auth dialog entry | public | Login / register |
| `/chat` | New chat | yes | Start a project or individual chat |
| `/chat/<uuid>` | Conversation | yes (owner) | Persistent thread |
| `/analytics` | Analytics | yes | Usage and health |
| `/financial` | Financial | yes | Bank statement parser |
| `/extract` | Extract | yes | PDF / image → text |
| `/settings` | Profile & preferences | yes | Profile, appearance, chat defaults |
| `/settings/models` · `/prompts` · `/tools` · `/agents` | Workspace config | yes | Registries |

Shell: left **sidebar** (workspace / tools / settings sections, projects, recent conversations, user menu) + main pane. **Command palette** (⌘K) jumps anywhere.

## 2. Primary flows

### A. First visit → signed in
1. Landing `/` → **Get started** → auth dialog.
2. Register (email, password) → token stored → redirect to the user's `default_home_tab` (default `/chat`).
3. *Errors:* email taken → inline "already registered"; weak/invalid input → field errors; rate limit → "too many attempts, try later".

### B. Returning user
`/` → root redirect checks token → valid: `/<default_home_tab>`; missing/expired: refresh once, else `/auth`.

### C. Create project & upload documents
1. Sidebar **New project** → dialog (name, optional system prompt) → project appears in sidebar.
2. Open **Document library** → drag/drop or choose files → `POST …/documents` → `202`; row shows **Pending**.
3. Worker processes → **Processing** → **Completed** (chunks searchable) or **Failed** with reason and a **Retry/Delete** action.
4. *Errors:* duplicate hash → "already uploaded"; file too large (>100 MB) → rejected before upload; unsupported type → toast.

### D. Project chat
1. **New chat** dialog → choose **Project chat** + project (scope mode per setting: clear / remember / all-completed).
2. Type question → **Send** → conversation URL `/chat/<uuid>` created, input disabled, SSE stream starts.
3. Tokens stream into the bubble; **Sources** panel fills with cited chunks; click a source → opens the original file at the cited document.
4. Thumbs up/down → feedback saved. Message actions: copy, regenerate.
5. *Weak evidence:* assistant says it can't find an answer in the documents (no invention).
6. *Errors:* stream drops → inline "connection lost — Retry"; model unreachable → "Local model unavailable" with link to Settings → Models; no completed documents → prompt to upload.

### E. Individual chat
New chat → **Individual chat** → same stream UX, no sources panel. After each user message a background task extracts entities to the graph. **Settings → Memory** (planned) lists and deletes remembered facts.

### F. Conversation history
Sidebar lists recent (paginated). Click → `/chat/<uuid>`. Rename / delete via item menu (delete asks for confirmation). Someone else's or missing id → "Conversation not found" → `/chat`.

### G. Extract
`/extract` → tab **PDF** or **Image** → upload → result text/structure shown → copy/download. Template matched by keywords → structured output; none matched → plain text with **Save as template**.

### H. Financial
`/financial` → upload statement → parsed transactions table → totals → export. Unparseable → "Format not recognised" with supported formats.

### I. Settings
- **Profile:** display name, change password (dialog; wrong current password → inline error).
- **Appearance:** system / light / dark.
- **Chat defaults:** home tab, new-chat scope mode, sidebar collapsed.
- **Models:** select provider/model, set parameters, **Test connection**, save key (encrypted). Choosing a cloud provider shows a "data leaves your network" notice.
- **Prompts / Tools / Agents:** list → create → delete (confirm).

### J. Sign out / session expiry
User menu → **Sign out** clears token → `/`. Any `401` mid-session → one silent refresh → else redirect to `/auth` with a "session expired" message; unsent draft is kept.

## 3. Global failure behaviour

| Situation | Landing |
|-----------|---------|
| Unknown route | 404 page with link to `/chat` |
| Unauthorised (401) | `/auth` |
| Forbidden / not owner (403/404) | "Not found" page |
| Server error (5xx) | Error boundary: message + **Try again** + request id |
| Backend down | Banner "Can't reach server", auto-retry |
| Offline mid-stream | Partial answer kept, **Retry** |

## 4. Background flow (not visible but must be specified)

Upload → API stores blob in MinIO + row in Postgres → enqueue Celery `process_document` → worker runs ingestion graph → Qdrant upserts → row `completed`/`failed`.
Chat message → enqueue `extract_and_store_memory` → Neo4j upserts.
