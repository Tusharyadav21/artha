# Data Flow and API

## 1. Fetching Strategy
- **Server Components**: Primary way to fetch data. Use `async` components.
- **Route Handlers**: Use for external webhooks or when a standard REST endpoint is needed by third parties.
- **Server Actions**: Use for all mutations (POST/PATCH/DELETE).

## 2. Mutations
- Use `useActionState` (or `useFormStatus`) for form handling.
- Always implement **Optimistic Updates** for critical UI interactions using `useOptimistic`.
- Revalidate data using `revalidatePath` or `revalidateTag` after successful mutations.

## 3. Validation
- All inputs (Params, SearchParams, Form Data) must be validated with **Zod**.
- Define schemas in `features/*/schemas.ts` to share between server and client.
