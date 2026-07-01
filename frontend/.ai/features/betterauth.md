# Authentication Architecture

This project uses **JWT-based authentication** against the FastAPI backend. There is no external auth provider — the backend handles registration, login, token refresh, and password management directly.

## How Auth Works

1. **User registers or logs in** via the backend API (`POST /api/auth/register` or `POST /api/auth/login`).
2. **Backend returns** an access token (30min TTL) and refresh token (7d TTL).
3. **Frontend stores** tokens in `localStorage` via `lib/api.ts`.
4. **Every API request** includes the Bearer JWT in the `Authorization` header.
5. **On 401**, the frontend attempts a token refresh via `POST /api/auth/refresh`.
6. **On refresh failure**, the user is redirected to login.

## Key Files

- `lib/api.ts` — `apiFetch` wrapper handling token injection, refresh, and error handling.
- `lib/cookies.ts` — Next-safe cookie reader/writer utilities.
- `app/(auth)/` — Login and register page components.

## Backend Auth Stack

- **Password hashing:** Argon2id (`passlib.hash.argon2` — time_cost=3, memory_cost=65536, parallelism=4)
- **Token signing:** JWT HS256 via PyJWT
- **Access token:** 30-minute TTL
- **Refresh token:** 7-day TTL with Redis-backed JTI blacklist (logout invalidates refresh tokens)
- **Rate limiting:** 5 req/min register, 10 req/min login

## Do Not

- Do not store session tokens manually in cookies or localStorage beyond what `api.ts` handles.
- Do not use BetterAuth, Prisma, or any other auth library — auth is server-side in the FastAPI backend.
- Do not call external auth providers unless adding a new feature explicitly requires it.
