<div align="center">
  <img src="../docs/assets/logo.png" width="80" alt="Artha Logo" />
  <h1>Artha - Frontend</h1>
  <p><strong>Next.js 16 + Bun + Tailwind CSS + Shadcn UI</strong></p>
</div>

---

## 🚀 Overview

The frontend is a modern, high-performance web application designed for interacting with the Artha system. It features a sleek dark-mode UI, real-time streaming chat, and comprehensive document management.

## ✨ Features

- **Real-time Chat**: Smooth, token-by-token streaming of agent responses.
- **Document Management**: Drag-and-drop uploads with real-time ingestion status.
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS.
- **State Management**: Robust handling of project and conversation state.
- **Authentication**: Secure login/signup against the FastAPI auth API.
- **Project Prompts**: Edit the backend-backed custom system prompt per project.
- **Scoped Retrieval**: Limit chat retrieval to selected completed documents.
- **Feedback**: Send thumbs-up/thumbs-down ratings to the backend message feedback endpoint.

## 🛠️ Environment Configuration

| Variable              | Description          | Default                 |
| :-------------------- | :------------------- | :---------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API Endpoint | `http://localhost:8000` |

## 📦 Local Development

### Prerequisites

- [Bun](https://bun.sh/) `1.0+`
- Node `20.9+` (for Next.js build tools)

### Setup & Run

1. **Install Dependencies**:

   ```bash
   bun install
   ```

2. **Start Development Server**:

   ```bash
   bun run dev
   ```

3. **Open Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

## 🔨 Build & Quality

- **Type Checking**: `bun run typecheck`
- **Linting**: `bun run lint`
- **Production Build**: `bun run build`
- **Full Frontend Check**: `bun run check`
- **Start Production**: `bun run start`

## 🐳 Docker

The frontend Dockerfile builds a standalone Next.js production server. Set
`NEXT_PUBLIC_API_URL` before building when the browser-facing backend URL is not
`http://localhost:8000`.

---

<p align="center">Part of the <a href="../README.md">Artha</a> Stack</p>
