# trackvest-web

Vite + React frontend for Trackvest. It currently covers:

- dashboard
- cashbook
- accounts
- assets
- investments
- ledger

## Stack

- React 19
- React Router 7
- TanStack Query
- Recharts
- Zustand
- Axios
- TypeScript
- Vite

## Local setup

1. Install dependencies

```bash
pnpm install
```

2. Configure environment

Local `.env` currently uses:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Authentication runs through the backend's cookie-based `/auth/login`
flow. The app sends requests with credentials and relies on the API's
httpOnly `access_token` / `refresh_token` cookies, so no hardcoded user id
is needed. Visit `/login` to sign in with a seeded account.

3. Start the app

```bash
pnpm dev
```

Default local URL:

- `http://localhost:3001`

## Backend dependency

This frontend expects the API server to be running at `VITE_API_BASE_URL`.

For normal local development:

- frontend: `http://localhost:3001`
- backend: `http://localhost:3000`

The backend repo is responsible for:

- seeded demo user
- account and asset APIs
- transaction import
- GL posting

## Main pages

Routes are defined in [src/app/route-config.tsx](/Users/vanessa/develop/trackvest-web/src/app/route-config.tsx):

- `/` dashboard
- `/cashbook`
- `/investments`
- `/gl` ledger
- `/accounts`
- `/assets`

## Current investment flow

The investments page is focused on capture-first workflows:

- manual `deposit`
- manual `buy`
- manual `sell`
- manual `dividend`
- CSV import for supported broker accounts

Current rules:

- only broker accounts with `broker = cathay` appear in CSV import
- assets must exist before they can be used in investment entry
- buy and sell amounts are computed from quantity, price, fee, and tax
- backend validation still owns cost-basis and oversell rules

## Useful commands

```bash
# dev server
pnpm dev

# production build
pnpm build

# lint
pnpm lint

# test
pnpm test

# preview build
pnpm preview
```

## Notes for development

- API requests are created in [src/lib/api.ts](/Users/vanessa/develop/trackvest-web/src/lib/api.ts); the axios instance sends `withCredentials: true` and silently retries once via `/auth/refresh` on 401.
- auth state lives in [src/app/auth-context.tsx](/Users/vanessa/develop/trackvest-web/src/app/auth-context.tsx); components read it through `useAuth()` / `useAuthenticatedUser()` in [src/app/use-auth.ts](/Users/vanessa/develop/trackvest-web/src/app/use-auth.ts)
- protected pages are gated by [src/app/ProtectedRoute.tsx](/Users/vanessa/develop/trackvest-web/src/app/ProtectedRoute.tsx); unauthenticated visitors are redirected to `/login`

## Known gaps

- CSV import is broker-specific, not generic
- frontend tests currently cover the dashboard, assets, and investments flows
