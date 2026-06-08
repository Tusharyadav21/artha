# AI Collaboration System

This is the central entry point for all AI agents working on the Artha application.
To avoid context bloat, our engineering standards and documentation are modularized.

## Available Context

Read these files based on the task you are performing:

- **[.ai/agent-rules.md](agent-rules.md)**: Universal behavioral rules for all AI agents (Read this first).
- **[.ai/nextjs-standards.md](nextjs-standards.md)**: Next.js v16.2 App Router best practices, conventions, and requirements.
- **[.ai/architecture.md](architecture.md)**: Project folder structure, data models, and API interactions.
- **[.ai/features/betterauth.md](features/betterauth.md)**: BetterAuth Best Practices for authentication.

## Core Directives

1. **Always refer to `.ai/nextjs-standards.md`** before creating a new component or route.
2. **Always refer to `.ai/architecture.md`** before changing file structures or API interactions.
3. Keep the codebase strictly typed.
4. If you add a new system, document it in a new file inside `.ai/features/` and link it here.
