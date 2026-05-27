# Gemini AI Agent - Frontend Developer Guide

This file provides high-context instructions, prompt directives, and architecture rules for **Gemini** developer agents when operating in the frontend directory.

---

## 🤖 1. Operating Instructions & Constraints

* **Strict typing compliance**: Enforce strict TypeScript types compiler checks (`"strict": true` compliant). Avoid `any` at all costs.
* **State hierarchies**: Derive parameters dynamically where possible. Default to URL parameters before introducing global context state. Never mirror backend data inside Zustand.
* **Input payload boundaries**: Validate form and search parameters on the client layer using **Zod** validation models.

---

## 📂 2. Directory Layout

```text
frontend/
├── src/
│   ├── app/        # Next.js page layouts and route composition
│   ├── components/ # Shared UI primitives & Shadcn blocks
│   ├── features/   # Self-contained feature folders
│   ├── hooks/      # Shared custom hooks
│   └── lib/        # Shared utility scripts (apiFetch helper)
```

---

## 🗺️ 3. Master Documentation Index

Refer to these master guides under `../docs/` for granular frontend architectures:
* **System Design**: [docs/architecture.md](../docs/architecture.md)
* **Next.js Folder Layout**: [docs/frontend-architecture.md](../docs/frontend-architecture.md)
* **React Components & styling**: [docs/frontend-components.md](../docs/frontend-components.md)
* **State & Caching Hierarchies**: [docs/frontend-state.md](../docs/frontend-state.md)
* **API contracts & SSE structures**: [docs/api.md](../docs/api.md)
* **Bun CLI & quality checks**: [docs/workflows.md](../docs/workflows.md)

---

## 🔨 4. CLI Execution Reference

* Sync Packages: `bun install`
* Start Dev Server: `bun run dev`
* TypeScript compiler checks: `bun run typecheck`
* Run Lints & Audits: `bun run lint`
* Verify entire pipeline: `bun run check`
* Production Bundle: `bun run build`
