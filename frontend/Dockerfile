# ──────────────────────────────────────────────────────────
# Artha Frontend — Production Container
# ──────────────────────────────────────────────────────────
# Multi-stage build using Bun for package management and
# Next.js standalone output for minimal runtime image.
# ──────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./

# Install ALL dependencies (needed for build)
RUN bun install --frozen-lockfile

# ── Stage 2: Builder ─────────────────────────────────────
FROM oven/bun:1 AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# ── Stage 3: Runtime ─────────────────────────────────────
FROM oven/bun:1-slim AS runtime

WORKDIR /app

# Copy standalone build output (Next.js outputFileTracing)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["bun", "run", "server.js"]
