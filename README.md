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
VITE_DEMO_USER_ID=889d1083-5b1d-4262-a162-4d24410da9f5
```

`VITE_DEMO_USER_ID` is important because the app injects it into every API request as `X-User-Id`.

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

- API requests are created in [src/lib/api.ts](/Users/vanessa/develop/trackvest-web/src/lib/api.ts)
- current user state is managed in [src/app/current-user.ts](/Users/vanessa/develop/trackvest-web/src/app/current-user.ts)
- the app assumes a single local demo user unless you explicitly switch it in code or env

## Known gaps

- CSV import is broker-specific, not generic
- frontend tests currently cover the dashboard, assets, and investments flows
