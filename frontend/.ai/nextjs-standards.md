# Next.js v16.2 Best Practices

This project uses Next.js v16.2 with the App Router. Strict adherence to these rules is mandatory.

## 1. Server vs Client Components

- **Default to Server Components**.
- Only add `"use client"` when necessary (e.g., `useState`, `useEffect`, `onClick`, browser APIs).
- **Never** add `"use client"` to a `page.tsx` file or to a layout that fetches data.
- Push Client Components down the component tree to the "leaves". Pass server-fetched data as props to Client Components.

## 2. Data Fetching & Suspense

- Fetch data directly in Server Components (no `useEffect` or React Query for server data).
- Every async Server Component **must** have a `<Suspense>` boundary above it with a skeleton fallback.
- Wrap independent data-fetching components in separate `<Suspense>` boundaries to enable parallel streaming.
- Use `React.cache()` to deduplicate identical fetches within a single request.

## 3. Server Actions (`lib/actions/`)

- Use Server Actions (`"use server"`) for form submissions and mutations.
- **Always validate inputs** at the top of the action using Zod schemas (`safeParse`).
- Always return a consistent shape: `{ data: any } | { error: string }`.
- Never `throw` errors directly to the client.
- Call `revalidatePath` or `revalidateTag` after every mutation to update the cache.

## 4. Route Handlers (`app/api/`)

- Use standard HTTP methods: `GET`, `POST`, `PUT`, `DELETE`.
- Validate all incoming request bodies with Zod.
- Return correct HTTP status codes (e.g., `400` for validation, `201` for created).
- Limit API routes to external webhooks or mobile clients. Prefer Server Actions for web app mutations.

## 5. Caching & Revalidation

- Next.js 16.2 uses aggressive caching. Explicitly opt-out of caching only when necessary using `export const dynamic = "force-dynamic"`.
- Use `revalidatePath` for simple route invalidation and `revalidateTag` for fine-grained cache control.

## 6. Performance Optimization

- Always use `next/image` for images (never raw `<img>`).
- Always use `next/link` for internal navigation.
- Load fonts via `next/font`.
- Lazy load heavy Client Components using `dynamic(() => import(...), { ssr: false })`.

## 7. Type Safety

- Extract and share Zod schemas between API routes and Server Actions in `types/schemas.ts`.
- Infer TypeScript types from Zod schemas: `type CreateVehicle = z.infer<typeof CreateVehicleSchema>`.
- Fully type Server Action return values.
