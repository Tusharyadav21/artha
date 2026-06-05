# BetterAuth Best Practices

This project uses [BetterAuth](https://better-auth.com/) for authentication.

## 1. Installation & Configuration

- Use `better-auth` and `@better-auth/react`.
- Configure the auth instance in `lib/auth.ts` using Prisma adapter (`@better-auth/prisma`).
- Export the Next.js route handler from `app/api/auth/[...all]/route.ts`.
- Create a client in `lib/auth-client.ts` using `createAuthClient`.

## 2. Plugins

- **Passkeys**: Use the `passkey` plugin (`better-auth/plugins/passkey`) to enable WebAuthn passkeys.

## 3. Database Schema

- The Prisma schema must include `User`, `Session`, `Account`, `Verification`, and `Passkey` models as per BetterAuth documentation.
- Link them securely with relations and cascade deletes.

## 4. Client Integration

- Use `authClient.useSession()` for client-side session retrieval.
- Use `authClient.signIn.social({ provider: "google" })` for Google Login.
- Use `authClient.signIn.passkey()` for passkey login.
- Do not store session tokens manually in cookies or `localStorage`; let BetterAuth handle it.

## 5. Server Integration

- For server components and Server Actions, fetch the session securely using `auth.api.getSession({ headers: await headers() })` (or equivalent for Next.js App Router).
- Protect sensitive routes using middleware or by checking the session at the root layout/page level.
