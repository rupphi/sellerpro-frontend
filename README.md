# Sellerpro frontend

Next.js App Router, React, Tailwind CSS and shared UI components.
Requires Node.js 24 LTS. Install with `npm ci`, run `npm run dev`.

The browser calls same-origin `/api`. Development rewrites to localhost:4000 by default;
set API_URL when using a different backend. API_URL is a **build-time** setting for the
standalone image. Production Nginx routes `/api` directly to the private backend.
Never put marketplace keys or database credentials in NEXT_PUBLIC variables.

## Structure

- `src/app/`: routes, layouts and global design tokens.
- `src/features/`: domain screens (pricing, sales, finance, stores, authentication, admin).
- `src/components/`: reusable accessible controls, calendar and loading states.
- `src/lib/`: API client, formatting and date utilities.
- `tests/`: unit tests and browser fixture scenarios. Browser scenarios are manual harnesses,
  not yet part of CI; their fixtures do not call real marketplace APIs.

`npm test`, `npm run build` and `npm run typecheck` run in CI.
Docker produces a standalone Next.js server on port 3000, running as a non-root user.
CI artifacts are immutable images tagged by commit SHA. Optional CD uses the shared
deployment stack in [sellerpro-backend](https://github.com/rupphi/sellerpro-backend/tree/main/deploy).
