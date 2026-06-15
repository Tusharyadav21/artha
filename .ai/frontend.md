# Next.js App Router & Frontend Architecture

This document details the folders layout, page routes, and Server Component guidelines of the Next.js frontend.

---

## 1. Directory Structure Conventions

We utilize **feature-driven folder boundaries** under `/frontend/`:

```txt
frontend/
  app/                 # App Router pages
    (auth)/            # Authenticated route group (login, register)
    workspace/         # Scoped projects, file manager, and chat features
      [projectId]/     # Dynamic Project ID dashboard route
    layout.tsx         # Central layout portal loading standard styling
    page.tsx           # Entry route redirecting based on session status
  components/          # Shared UI components
    app/               # Feature components (chat, project, document dialogs)
    ui/                # Primitives (button, input, dialog, toast)
  lib/                 # Shared utilities, API client, constants
```

### Conventions
- Shared constants (file types, size limits) live in `lib/constants.ts`.
- API client lives in `lib/api.ts` with token injection and error handling.
- Shared utilities in `lib/utils.ts` (e.g. `cn()`, `formatBytes()`).

---

## 2. Server Components by Default

To optimize performance and minimize hydration payloads, all React pages are **Server Components by Default**.

- **"use client" Directive**: Limit this declaration strictly to isolated, interactive leaf elements (e.g. input bars, toggle buttons, modal managers).
- **Isolation of Interactivity**:
  - Fetch initial layout configurations inside an `async` Page Server Component, and pass results down to a clean, decoupled Client Form Component.

---

## 3. Route Handlers & Server Actions

- **Server Actions**: Use for all mutations (submitting feedback, modifying system prompts, creating workspace projects). Apply Zod validation in every action handler.
- **Route Handlers**: Reserve solely for third-party HTTP integrations or static, headless endpoints.

---

## 4. Build & Lint Commands

- **Package manager**: `bun`
- **Type check**: `bun run typecheck`
- **Lint**: `bun run lint`
- **Build**: `bun run build`
- **Full check** (types + lint + build): `bun run check`

---

## 5. SEO & Dynamic Metadata

- **Descriptive Titles**: Every page route must export a unique `Metadata` configuration (or execute `generateMetadata` for dynamic routes):
  ```typescript
  export const metadata: Metadata = {
    title: "Dashboard | Artha",
    description: "Manage local knowledge workspace document processing and private inference.",
  };
  ```
- **Semantic DOM Elements**: Keep headings semantic, utilizing a single `<h1>` per viewport and scoping pages inside standard structural blocks (`<main>`, `<nav>`, `<footer>`).

---

## 6. File Upload UX

- File type restrictions and size limits use the shared `ACCEPTED_FILE_TYPES` / `MAX_UPLOAD_SIZE` constants from `@/lib/constants`.
- These are UX-only constraints; server-side validation enforces actual limits.
- Hidden `<input type="file">` elements should include an `accept={ACCEPTED_FILE_TYPES}` attribute.
