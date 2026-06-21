# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Dev Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npm run start     # Start production server
```

The local dev server runs on `http://localhost:3000`. Login credentials for dev server is available in .env file

## Architecture Overview

This is a **Next.js 16 App Router** personal finance dashboard with two domains: **fund management** (investments, balance sheet, transactions) and **flight tracking** (travel log, route map). It uses **Supabase** (Postgres + Auth) and is styled with **Tailwind CSS v4 + shadcn/ui** (Radix primitives).

### Data Fetching Strategy

The app uses **two distinct data-fetching paths**:

1. **Server Components with `"use cache"`** — Dashboard, Annual Recaps, and Flights Map stats are fetched server-side using Next.js Cache Components. These functions live in `src/lib/server/` and use `cacheTag()` + `cacheLife('days')`. The revalidation endpoint at `/api/revalidate` calls `revalidateTag()` to bust the cache.

2. **Client-side SWR hooks** — Balance Sheet, cash assets, currency rates, and asset search use SWR hooks in `src/hooks/` that call Supabase directly from the browser. These are configured with `revalidateOnFocus: false` and long deduping intervals.

3. **Client-side Infinite Query** — Flights history and Transactions use a custom `useInfiniteQuery` hook (`src/hooks/use-infinite-query.ts`) for cursor-free paginated lists. It uses `useSyncExternalStore` with an empty SSR snapshot for hydration safety, and recreates its internal store when `trailingQueryKey` changes (filter/date changes). This hook is inherently client-only.

Pattern: **Page files are Server Components** that pass data or nothing to **Client Components** (named `client.tsx` in the same directory). When there is no server data to fetch (e.g., transactions page), `page.tsx` simply renders `<ClientComponent />` directly — no Suspense wrapper needed since nothing async runs on the server. Reserve Suspense boundaries for pages where the server does async work (e.g., `flights/history` fetches reference data).

### Supabase Clients (3 types)

| Client | File | Use case |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` | Client Components and SWR hooks |
| Server | `src/lib/supabase/server.ts` | Server Components (reads cookies via `next/headers`) |
| Admin | `src/lib/supabase/admin.ts` | Server-only operations with service_role bypassing RLS |

The browser and server clients use the **publishable key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The admin client uses the **secret key** (`SUPABASE_SECRET_KEY`) and throws if imported client-side.

The `flight` schema is used for flight-related tables; all fund-related tables are in the `public` schema.

### Auth

- **Auth proxy**: `src/proxy.ts` is the Next.js middleware entry point. It checks session cookies via `@supabase/ssr` and redirects unauthenticated users to `/login`. The matcher excludes `api`, static files, and images.
- **Login page**: `src/app/login/` — uses the browser Supabase client with `signInWithPassword`.
- **Logout**: Triggered from the sidebar via `supabase.auth.signOut()`.

### External API: DNSE Broker

`src/lib/dnse/` integrates with a Vietnamese stock broker API (`api.dnse.com.vn`). Auth uses token-based login with shared-promise deduplication to prevent concurrent logins (8-hour token expiry). Exposed via API routes under `/api/dnse/`.

### Cache Invalidation

`/api/revalidate` accepts a POST with `{ tags: ["analytics", "flights", "news"] }` and an `x-revalidate-secret` header. Only `analytics`, `flights`, and `news` tags are whitelisted. This is called by Supabase database webhooks to update dashboard data when underlying tables change.

### Key Libraries

- **shadcn/ui** with `radix-luma` style, `zinc` base color, CSS variables, Lucide icons
- **@tanstack/react-table** for table components
- **Recharts** for chart components (area, pie, stacked bar — wrapped in `src/components/charts/`)
- **react-leaflet** + Leaflet for the flight route map
- **React Hook Form** + Zod for form validation (schemas live next to forms, e.g., `form/schema.ts`)
- **@dnd-kit** for drag-and-drop (sortable lists)
- **SWR** for client-side data fetching
- **date-fns** for date manipulation
- **yahoo-finance2** for market data

### Styling Conventions

- Tailwind CSS v4 with `@import "tailwindcss"` (no `tailwind.config.ts`)
- Dark mode only — the `<html>` tag has `className="dark"` hardcoded in the root layout
- CSS custom properties defined in `:root` and `.dark` selectors in `globals.css`
- shadcn/ui components use the `cn()` utility from `@/lib/utils` for className merging

### Project Conventions

- `@/` path alias maps to `src/`
- `use client` directive on all components that use hooks, browser APIs, or Supabase browser client
- Form components follow the pattern: schema (Zod) → form definition (React Hook Form) → field components
- Feature-specific hooks are co-located in `hooks/` directories within the feature folder (e.g., `src/app/fund/transactions/hooks/use-transaction-filters.ts`), not in the global `src/hooks/`. Global hooks cover cross-cutting concerns (data fetching, shared state).
- Number formatting: use `formatNum()` and `compactNum()` from `src/lib/utils.ts` — these cache `Intl.NumberFormat` instances for performance
- When the user asks to commit and push, review `CLAUDE.md` first and update it to reflect any architectural changes, new patterns, or conventions introduced in the diff. Do this before staging commits.
