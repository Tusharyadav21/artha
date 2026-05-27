# Frontend State Management & Caching Hierarchies

This document defines standard practices for managing variable states, URL parameters, server caching, and global client stores.

---

## 🏛️ 1. The State Hierarchy

To prevent bloated rendering paths and synchronization bugs, all data parameters must align to this specific **State Hierarchy**:

```
[1. URL State] ───────> Pagination, sort metrics, search strings, current active tab
      │
      ▼
[2. Server Cache] ────> React Query / Next.js Server cache (the source of truth)
      │
      ▼
[3. Local UI State] ──> useState / useReducer (modals open/close, drag highlights)
      │
      ▼
[4. Global Store] ────> Zustand (reserved ONLY for auth session & visual theme state)
```

---

## 🧭 2. URL State & Parameter Persistence

- **Primary Selection**: Always default to Next.js URL Search Parameters (`next/navigation` hooks) for filtering catalogs, scoping search queries, tracking page pagination, and marking selected tabs.
- **Benefits**:
  - Direct sharing: Users can share the exact filtered catalog state by copy-pasting URLs.
  - History preservation: Support native browser Back/Forward navigations automatically.

---

## 📡 3. Server State & Caching Rules (React Query)

- **Direct Cache Access**: Never synchronize server response arrays into local component states or global Zustand stores. Read directly from the query cache using standard fetching hooks.
- **Cache Invalidation**: On successful mutations (using Server Actions or REST calls), always trigger exact cache invalidation loops:
  ```typescript
  // Trigger immediate cache updates
  queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'documents'] });
  ```
- **Optimistic Updates**: For instant interface responses (e.g. appending a sent message card to a chat bubble grid), use React's `useOptimistic` hook to immediately update the visual state before the server responds.

---

## 🛡️ 4. Zustand Global Store Constraints

- **Scope Capping**: Do not store features, lists, forms, or data records in Zustand. 
- **Zustand Criteria**: An entity is eligible for a global store *only* if:
  1. It is consumed by 90%+ of all workspace viewports (e.g. active User authentication details).
  2. It manages global environment conditions (e.g. system dark/light theme choices).
