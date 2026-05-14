# Engineering Rules — Next.js Application

This project prioritizes:
- Maintainability
- Predictability
- Reusability
- Performance
- Scalability
- Clean architecture

The codebase must avoid:
- Patchwork fixes
- Temporary hacks
- Duplicate logic
- Over-engineering
- Deep prop drilling
- Giant components
- Unstructured state management
- Mixed concerns

---

# Core Principles

## 1. Never Patch — Refactor Properly
Do not add workaround code beside broken logic.

**BAD:**
- Adding conditionals to bypass architectural problems
- Creating duplicate APIs/components/hooks
- Adding "temporary" fixes

**GOOD:**
- Refactor the root issue
- Remove obsolete logic
- Consolidate duplicated behavior
- Improve architecture while fixing bugs

Rule:
> Every fix should leave the codebase cleaner than before.

---

# Project Structure
Use feature-first architecture.

```txt
src/
  app/
  components/
    ui/
    shared/
  features/
    auth/
    dashboard/
    billing/
  hooks/
  lib/
  services/
  server/
  stores/
  types/
  utils/
```

---

# Folder Responsibilities

## app/
Only:
* Routes
* Layouts
* Metadata
* Server Components
* Route-level composition

Do NOT place:
* Business logic
* Fetch logic abstraction
* Reusable UI logic

## components/ui
Pure reusable UI primitives.
Examples: Button, Dialog, Modal, Table, Input.
Rules: No business logic, No API calls, No feature-specific code.

## components/shared
Reusable cross-feature components (e.g., PageHeader, EmptyState).

## features/
Feature-scoped architecture. Each feature owns: components, hooks, actions, validation, state, tests, types.

---

# Component Rules

## Keep Components Small
If a file exceeds ~250 lines:
* Split logic
* Extract hooks
* Extract child components

## Reusability Rule
If logic/UI is reused 2+ times: Extract it. Do not copy-paste.

---

# Next.js Rules

## Prefer Server Components
Use Server Components by default. Only use `"use client"` when required for interactivity, browser APIs, or client state.

## Data Fetching
Fetch on server whenever possible using async Server Components or Server Actions. Avoid unnecessary client-side fetching.

## Server Actions
- Keep actions focused
- Validate all inputs with Zod
- Never expose raw DB logic to UI
- Return typed responses

---

# State Management
Use URL state, Server state (React Query), or Local state before introducing global stores (Zustand/Context).

---

# TypeScript Rules
- **Never use `any`**. Use `unknown`, generics, or discriminated unions.
- Shared types go in `types/`. Feature-specific types stay in the feature folder.

---

# AI Agent Instructions
When generating code:
1. Follow existing architecture.
2. Reuse existing components/hooks/utilities.
3. Refactor instead of patching.
4. Prefer server-side solutions first.
5. Every change should reduce complexity and improve maintainability.

---

# Related Documentation
- [Architecture Details](./docs/ARCHITECTURE.md)
- [Naming Conventions](./docs/NAMING-CONVENTIONS.md)
- [Data Flow & API](./docs/DATA-FLOW.md)
- [State Management](./docs/STATE-MANAGEMENT.md)
- [Component Guidelines](./docs/COMPONENT-GUIDELINES.md)
