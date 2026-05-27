# ChatGPT Codex / Cursor / Windsurf - Frontend Developer Guide

This file provides system prompt directives, CLI references, and architecture boundaries for **ChatGPT Codex, Cursor, and Windsurf** agents when operating in the frontend directory.

---

## 🤖 1. Operating & Coding Directives

* **Follow Layer boundaries**: Keep component design clean. Keep business rules out of presentational UI and fetch helpers out of client layout views.
* **Tailwind Sequential sorting**: Sort all visual classes in component styling: (1) Layout, (2) Sizing & spacing, (3) Typography, (4) Borders/colors, (5) Interactive transitions.
* **Component Size constraint**: Components must remain modular (under 250 lines). Split logic into custom React hooks inside features.

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
