# Project Architecture

## High-Level Structure

```
app/
  (workspace)/                ← Route group for authenticated workspace pages
    analytics/
      page.tsx                ← Analytics/Usage insights view
    chat/
      page.tsx                ← Live RAG chat stream view
    settings/
      page.tsx                ← Settings/System prompts view
    video/
      page.tsx                ← Video generation and review view
    layout.tsx                ← Workspace layout checks auth session, embeds WorkspaceShell
  globals.css                 ← Core Tailwind imports and global style tokens
  layout.tsx                  ← Root layout (loads global CSS, Toast notifications, ThemeProvider)
  page.tsx                    ← Landing / authentication entry page (redirects to /chat if logged in)
components/
  app/                        ← App-specific layout, view, and workspace provider/shell components
  landing/                    ← Unauthenticated landing and login page components
  layout/                     ← Core structural views (sidebar, navbar)
  ui/                         ← UI primitives / shadcn components (button, dialog, toast, etc.)
  theme-provider.tsx          ← Theme boundary (supports dark/light mode toggle)
lib/
  api.ts                      ← Backend REST client (wraps fetch and JWT handling, exports data models/types)
  app-storage.ts              ← Local storage key constants
  chat-stream.ts              ← Server-Sent Events (SSE) chat stream parser
  cookies.ts                  ← Next-safe cookie reader/writer utilities
  motion.ts                   ← Framer Motion animation presets
  utils.ts                    ← Tailwind styling utility (`cn` helper)
```

## Data Model

- `User`: Application users credentials and session details.
- `Project`: Scoping container for document isolation and chat history.
- `Document`: Document metadata, parsing states, and storage details.
- `DocumentChunk`: Semantic vector chunks and embeddings (1024-dimensional vectors via Ollama embedding model).
- `Conversation`: Persistent chat session instances.
- `Message`: Discrete dialogue exchanges with citations and feedback.

## Conventions

- **Component File**: Max 150 lines. Extract sub-components. PascalCase naming (e.g., `ChatView.tsx`).
- **Backend API Calls**: All backend communication must be done using `apiFetch` in `lib/api.ts`. Do not call the database directly or write fetch requests inline.
- **Styling**: Tailwind CSS via utility classes. Use `cn()` (clsx + tailwind-merge) for conditional classes. Use `lucide-react` for icons.
- **State Management**: Utilize client context providers (like `workspace-provider.tsx`) to manage shared project state, selected documents, and active conversation rather than introducing complex global stores.
