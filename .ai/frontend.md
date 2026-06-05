# Next.js App Router & Frontend Architecture

This document details the folders layout, page routes, and Server Component guidelines of the Next.js v16.2 frontend.

---

## 📂 1. Directory Structure Conventions

We utilize **feature-driven folder boundaries** under `/frontend/src/`:

```txt
src/
  app/                 # Layouts, Page files, Route boundary definitions
    (auth)/            # Authenticated route group (login, register)
    workspace/         # Scoped projects, file manager, and chat features
      [projectId]/     # Dynamic Project ID dashboard route
    layout.tsx         # Central layout portal loading standard styling
    page.tsx           # Entry route redirecting based on session status
  features/            # Component groups isolated per business capabilities
    auth/              # Authentication forms, verification hooks
    projects/          # Workspace selection sidebar and prompts controls
    documents/         # Upload drag-and-drop queues and polling indicators
    chat/              # SSE message streams and bubble cards
```

### Feature Boundary Guidelines
* Features are isolated.
* High-traffic features export their public components via `index.ts`.
* Features are prohibited from reading or importing code within another feature's internal folders directly. Move shared utilities to `@/lib` or `@/components/shared`.

---

## ⚛️ 2. Server Components by Default

To optimize performance and minimize hydration payloads, all React pages are **Server Components by Default**.

* **"use client" Directive**: Limit this declaration strictly to isolated, interactive leaf elements (e.g. input bars, toggle buttons, modal managers).
* **Isolation of Interactivity**:
  * **BAD**: Mark a whole route page as `"use client"` just to handle an `onSubmit` form trigger.
  * **GOOD**: Fetch initial layout configurations inside an `async` Page Server Component, and pass results down to a clean, decoupled Client Form Component.

---

## 📡 3. Route Handlers & Server Actions

* **Server Actions**: Use for all mutations (submitting feedback, modifying system prompts, creating workspace projects). Apply Zod validation in every action handler.
* **Route Handlers**: Reserve solely for third-party HTTP integrations or static, headless endpoints. Use standard `apiFetch` in `@/lib/api.ts` for all client browser mutations.

---

## 🔍 4. SEO & Dynamic Metadata

- **Descriptive Titles**: Every page route must export a unique `Metadata` configuration (or execute `generateMetadata` for dynamic dynamic routes):
  ```typescript
  export const metadata: Metadata = {
    title: "Dashboard | Agentic RAG",
    description: "Manage local knowledge workspace document processing and private inference."
  };
  ```
- **Semantic DOM Elements**: Keep headings semantic, utilizing a single `<h1>` per viewport and scoping pages inside standard structural blocks (`<main>`, `<nav>`, `<footer>`).
