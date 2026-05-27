# ChatGPT Codex / Cursor / Windsurf Agent Portal

This root-level file acts as a lightweight entry portal and index to prevent Cursor, Windsurf, and ChatGPT Codex agents from consuming unnecessary LLM context during development.

---

## 📂 1. Directory-Scoped AI Portals

Depending on the workspace subdirectory you are currently operating in, refer to the dedicated agent configuration files:

* **Backend Workspaces (Strictly async Python/FastAPI)**: Refer to [backend/AGENTS.md](backend/AGENTS.md) for data isolation repository rules, workers, and API setups.
* **Frontend Workspaces (Strictly Next.js v16.2 App Router)**: Refer to [frontend/AGENTS.md](frontend/AGENTS.md) for React component sizes, Tailwind Sequential sorting, and state rules.

---

## 🗺️ 2. Modular Master Documentation System

For granular designs and style specifications, inspect the single-purpose documents under `/docs/`:

* **Architecture Diagrams**: [docs/architecture.md](docs/architecture.md)
* **SQL Models Schema**: [docs/database.md](docs/database.md)
* **API Specifications**: [docs/api.md](docs/api.md)
* **Next.js Folder Layouts**: [docs/frontend-architecture.md](docs/frontend-architecture.md)
* **React Components & CSS**: [docs/frontend-components.md](docs/frontend-components.md)
* **State & Caching Hierarchies**: [docs/frontend-state.md](docs/frontend-state.md)
* **Python Layer Separation**: [docs/backend-architecture.md](docs/backend-architecture.md)
* **pgvector RAG Pipelines**: [docs/backend-rag.md](docs/backend-rag.md)
* **Remotion Video Synthesis**: [docs/backend-video.md](docs/backend-video.md)
* **CLI Cheat Sheet**: [docs/workflows.md](docs/workflows.md)
* **Troubleshooting Runbook**: [docs/troubleshooting.md](docs/troubleshooting.md)
* **Project Roadmap**: [docs/roadmap.md](docs/roadmap.md)
