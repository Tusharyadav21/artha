# Claude Code - Frontend Developer Guide

This file provides system instructions, command references, and architecture standards for **Claude Code** (claude.ai/code) when operating in the frontend directory.

---

## 🤖 1. Operating & Coding Directives

* **Server Components by Default**: All React components in `src/app/` must be Server Components. Use `"use client"` only when interactivity is required.
* **Component Size constraint**: React components must remain small (ideally under 250 lines). Split logic into dedicated hooks or child components.
* **TypeScript strict check**: Implicit `any` is strictly prohibited. Provide complete types for component props.

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

## 🗺️ 3. Modular Master Documentation Index

Refer to these single-purpose guides under `../docs/` for granular frontend architectures:
* **System Design**: [docs/architecture.md](../docs/architecture.md)
* **Next.js Folder Layout**: [docs/frontend-architecture.md](../docs/frontend-architecture.md)
* **React Components & styling**: [docs/frontend-components.md](../docs/frontend-components.md)
* **State & Caching Hierarchies**: [docs/frontend-state.md](../docs/frontend-state.md)
* **API contracts & SSE structures**: [docs/api.md](../docs/api.md)
* **Bun CLI & quality checks**: [docs/workflows.md](../docs/workflows.md)

---

## 🔨 4. Quick Command Reference

* Sync Packages: `bun install`
* Start Dev Server: `bun run dev`
* TypeScript compiler checks: `bun run typecheck`
* Run Lints & Audits: `bun run lint`
* Verify entire pipeline: `bun run check`
* Production Bundle: `bun run build`
