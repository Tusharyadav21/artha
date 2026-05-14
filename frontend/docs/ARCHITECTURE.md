# Architecture Guidelines

## Feature-Driven Development (FDD)
We follow a feature-based folder structure. Each feature is self-contained.

### 1. Feature Boundaries
- A feature should not import from the `internal` folders of another feature.
- Shared logic must be moved to `@/lib`, `@/hooks`, or `@/components/shared`.
- Use `index.ts` in each feature folder to export its public API.

### 2. Layers
- **UI Layer**: React components (`@/components`, `@/features/*/components`).
- **Logic Layer**: Custom hooks (`@/hooks`, `@/features/*/hooks`).
- **Data Access Layer**: Server Actions (`@/features/*/actions`) and Services (`@/services`).
- **Domain Layer**: Types and Zod schemas (`@/types`, `@/features/*/schemas`).

### 3. Dependency Rules
- **DO:** UI -> Hooks -> Actions -> DB/API.
- **DON'T:** Database logic inside a Client Component.
- **DON'T:** Circular dependencies between features.
