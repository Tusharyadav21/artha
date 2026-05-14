# State Management

## 1. The State Hierarchy
Before adding state, ask: "Can this be derived or moved up?"

1. **URL State**: First choice for sort, filters, pagination, and tabs. (Use `next/navigation`).
2. **Server State**: Use **React Query** (TanStack Query) for client-side caching or Next.js cache for server-side.
3. **Local State**: Use `useState` / `useReducer` for component-specific UI state.
4. **Context/Global**: Use **Zustand** only for truly global app state (Auth, Theme, Cart).

## 2. Persistence
- Use URL search parameters for filter persistence so users can share links.
- Avoid syncing server state into global stores. Use the cache directly.
