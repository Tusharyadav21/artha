# Antigravity AI Agent - Frontend Developer Guide

This file provides system instructions, operational workflows, and design directives for **Antigravity** developer agents when operating in the frontend directory.

---

## 🤖 1. Operating Instructions & Constraints

* **Rich Aesthetics**: All React UIs must look premium (harmonized color palettes, dark modes, glassmorphism card layouts, and micro-animations). Avoid browser defaults.
* **No Placeholders**: Never write incomplete component code blocks or stub visual screens. Use `generate_image` to iterate on stunning UI elements.
* **Planning Mode rules**: Adhere to planning workflows inside `brain/<conversation-id>`. Generate the `implementation_plan.md` first and obtain explicit user approval before modifying workspace source files.

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

Refer to these single-topic manuals under `../docs/` for granular designs:
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
