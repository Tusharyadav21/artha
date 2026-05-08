<div align="center">
  <img src="docs/assets/logo.png" width="120" alt="Agentic RAG Logo" />
  <h1>Agentic RAG</h1>
  <p><strong>A Local-First, Autonomous Agentic Retrieval-Augmented Generation Stack</strong></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-orange?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
  [![Ollama](https://img.shields.io/badge/Ollama-black?style=for-the-badge)](https://ollama.com/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
</div>

---

<p align="center">
  <img src="docs/assets/hero.png" width="800" alt="Agentic RAG Hero" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />
</p>

## 🌟 Overview

**Agentic RAG** is a state-of-the-art, local-first stack designed for building production-ready RAG applications with autonomous reasoning capabilities. By combining the power of **LangGraph** for orchestration and **Ollama** for local inference, it provides a secure, private, and highly customizable environment for your data.

### Why Agentic RAG?
- **Privacy First**: Everything runs locally. No data leaves your infrastructure.
- **Autonomous Reasoning**: Agents can self-correct, plan, and refine their search strategies.
- **Production Ready**: Full observability with Langfuse and robust auth with Better Auth.
- **Blazing Performance**: Powered by Bun, FastAPI, and Redis-backed background workers.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🤖 Agentic Orchestration** | Powered by **LangGraph**, enabling complex multi-step reasoning, self-correction, and planning. |
| **🏠 Local-First** | Native support for **Ollama**, allowing you to use Qwen, Llama, and Nomic Embed locally. |
| **⚡ Async Processing** | Redis and **Arq** workers handle heavy document ingestion and vectorization in the background. |
| **🔍 Vector Search** | Leveraging **pgvector** in PostgreSQL for high-performance semantic retrieval. |
| **🎨 Modern UI** | A sleek, responsive dashboard built with **Next.js 14**, **Bun**, and **Shadcn UI**. |
| **🛡️ Secure & Observable** | Integrated **Better Auth** and **Langfuse** for enterprise-grade management. |

---

## 🏗️ Architecture

```mermaid
graph TD
    User([User]) <--> Frontend[Next.js Frontend]
    Frontend <--> API[FastAPI Backend]
    API <--> DB[(PostgreSQL + pgvector)]
    API <--> Redis{Redis / Arq}
    Redis <--> Worker[Background Worker]
    Worker <--> Ollama[Ollama LLMs/Embed]
    API <--> LangGraph[LangGraph Agent]
    LangGraph <--> Ollama
    API <--> Auth[Better Auth]
    API <--> Observability[Langfuse]
```

---

## 🚀 Quick Start (Docker)

Get up and running in minutes with Docker Compose.

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Prepare Local LLMs (Ollama)
Ensure [Ollama](https://ollama.com) is installed and running on your host machine:
```bash
ollama serve &
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

### 3. Launch Stack
```bash
docker compose up --build -d
```

### 4. Database Initialization
```bash
docker compose exec backend alembic upgrade head
```

**Services:**
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Langfuse**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Manual Development

For detailed instructions on running individual components locally, check the sub-project readmes:

- [📂 **Backend Documentation**](./backend/README.md)
- [📂 **Frontend Documentation**](./frontend/README.md)
- [🗺️ **Project Roadmap**](./ROADMAP.md)
- [🔍 **Troubleshooting Guide**](./TROUBLESHOOTING.md)

### Prerequisites
- Python `3.12+` with `uv`
- Bun `1.0+`
- PostgreSQL `16+` with `pgvector`
- Redis `7+`

---

## 📂 Project Structure

```text
.
├── backend/            # FastAPI API & Arq Workers
│   ├── alembic/        # DB Migrations
│   ├── src/            # Core logic, agents, and API
│   └── tests/          # Pytest suite
├── frontend/           # Next.js Application
│   ├── src/            # Components, Hooks, and App Router
│   └── public/         # Static assets
├── infra/              # Infrastructure configurations
├── docs/               # Documentation & Assets
├── docker-compose.yml  # Orchestration
└── .env.example        # Template configuration
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

---

<p align="center">Built with ❤️ by the Agentic RAG Team</p>
