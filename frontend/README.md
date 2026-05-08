# Frontend (Next.js + Bun)

Frontend client for Agentic RAG.

## Prerequisites
- Bun `>=1.0`
- Node `>=20.9` (required by Next.js tooling)
- Backend running at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)

## Environment

Frontend reads:
- `NEXT_PUBLIC_API_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

Reference values are in [.env.example](/Users/suven/Desktop/repo/agentic_rag/.env.example).

## Run with Docker Compose

From repo root:
```bash
docker compose up --build frontend
```

Open:
`http://localhost:3000`

## Run Locally (No Compose)

```bash
cd frontend
bun install
bun run dev
```

Open:
`http://localhost:3000`

## Build and Quality Checks

Typecheck:
```bash
bun run typecheck
```

Lint:
```bash
bun run lint
```

Production build:
```bash
bun run build
```

## Scripts
- `bun run dev` - start dev server
- `bun run build` - create production build
- `bun run start` - run production server
- `bun run lint` - run ESLint
- `bun run typecheck` - run TypeScript checks
