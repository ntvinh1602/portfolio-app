# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Dev Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npm run start     # Start production server
```

---

## Canonical Page Component Pattern: Server-First with Streaming

All pages MUST follow this 3-layer pattern. The flights pages (`/flights/map`, `/flights/history`) are the reference implementation.

### Layer 1 — Page (Server Component)

The exported page is a thin orchestrator. It wraps each data source in its own `<Suspense>` boundary with a `Spinner` fallback. The page itself never fetches data.

```tsx
// src/app/flights/map/page.tsx
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"

export default function FlightsMapPage() {
  return (
    <div className="flex flex-col h-full gap-4 px-4 pb-4">
      <Suspense fallback={<Spinner />}>
        <StatsCarouselData />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <MapData />
      </Suspense>
    </div>
  )
}
```

### Layer 2 — Inline Async Data-Fetcher

Defined in the same file below the exported page. Calls `"use cache"` server actions. Transforms raw data into prop shapes (option arrays, computed values). Passes resolved data to client components. Never contains JSX for the data source itself — delegates to client components.

```tsx
// Inline in page.tsx (not exported, not a separate file)
async function StatsCarouselData() {
  const stats = await getLifetimeStats()
  return <StatsCarousel stats={stats} />
}

async function MapData() {
  const [routes, airports] = await Promise.all([
    getRoutesGeoJSON(),
    getAirports(),
  ])
  return (
    <div className="relative h-full rounded-2xl overflow-hidden isolate">
      <LeafletMapDynamic routes={routes} airports={airports} />
    </div>
  )
}
```

For pages that need reference data computed before passing to a client component:

```tsx
// Inline in page.tsx — src/app/flights/history/page.tsx
async function FlightsListData() {
  const [airlines, aircrafts, airports] = await Promise.all([
    getAirlines(),
    getAircrafts(),
    getAirports(),
  ])

  // Transform raw data into option shapes on the server
  const airlineFilterOptions = airlines.map(a => ({
    label: a.name, value: a.name,
  }))
  const availableYears = Array.from({ length: 11 }, (_, i) =>
    String(new Date().getFullYear() - i)
  )
  const airlineFormOptions = airlines.map(a => ({
    label: a.name, value: a.id,
  }))
  const aircraftFormOptions = aircrafts.map(a => ({
    label: a.model ? `${a.icao_code} — ${a.model}` : a.icao_code,
    value: a.id,
  }))
  const airportFormOptions = airports.map(a => ({
    label: `${a.iata_code} — ${a.name}`,
    value: a.id,
  }))

  return (
    <FlightsList
      airlineFilterOptions={airlineFilterOptions}
      availableYears={availableYears}
      airlineFormOptions={airlineFormOptions}
      aircraftFormOptions={aircraftFormOptions}
      airportFormOptions={airportFormOptions}
    />
  )
}
```

### Layer 3 — Client Components

Receive ALL data via props. Must use `"use client"`. Never call data-fetching hooks (`useSWR`, `useFlightReferenceData`, etc.) — those belong at Layer 2 via server actions. May use state-management hooks (`useState`, `useFlightsFilters`) and interaction hooks (`useInfiniteQuery` for paginated lists). Pure presentation or interactive — never mixes data fetching with rendering.

```tsx
// src/features/flights/components/stats-carousel.tsx
"use client"
export default function StatsCarousel({ stats }: { stats: LifetimeStats }) {
  // Pure presentation — receives all data, runs no hooks that fetch
  return (/* carousel UI */)
}
```

```tsx
// src/features/flights/components/flights-list.tsx
"use client"
interface FlightsListProps {
  airlineFilterOptions: { label: string; value: string }[]
  availableYears: string[]
  airlineFormOptions: { label: string; value: string }[]
  aircraftFormOptions: { label: string; value: string }[]
  airportFormOptions: { label: string; value: string }[]
}
export default function FlightsList({ airlineFilterOptions, ... }: FlightsListProps) {
  // Client state: filters, infinite query, dialog — receives reference data as props
  const { filters, setFilters, trailingQuery, trailingQueryKey, triggerRefresh } = useFlightsFilters()
  const { data: flights, count, ... } = useInfiniteQuery<Flight>({ ... })
  // ...
}
```

### When to Use Each Variation

| Scenario | Suspense Strategy | Example |
|----------|-------------------|---------|
| Multiple independent data sources that can stream independently | Multiple `<Suspense>` boundaries, one per data-fetcher | `/flights/map` — stats carousel and map render as soon as their data arrives |
| All data needed before any client content renders | Single `<Suspense>` boundary | `/flights/history` — filter sidebar and form dialog both need reference data |
| No server data to fetch (fully client-driven page) | No Suspense needed — direct `<ClientComponent />` | Transactions page — all data is paginated and filtered client-side |

### Server Actions with `"use cache"`

Server actions that fetch read-only reference or aggregate data MUST use this pattern:

```tsx
// src/features/flights/actions/get-airports.ts
import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type Airport = { id: string; iata_code: string; name: string; lat: number; lng: number }

export async function getAirports() {
  "use cache: private"
  cacheTag("flights")     // tag for revalidation via /api/revalidate
  cacheLife("days")       // cache TTL

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airports")
    .select("id, iata_code, name, lat, lng")

  if (error) throw new Error(error.message)
  return data as Airport[]
}
```

Key rules:
- `"use cache: private"` directive at the top of the function body
- `cacheTag()` for grouped cache invalidation (tag must be whitelisted in `/api/revalidate`)
- `cacheLife("days")` for long-lived reference data
- Use `createClient()` from `@/lib/supabase/server` (never the browser client)
- Export the return type so callers can use it
- Throw on error — the `<Suspense>` error boundary handles it

### Anti-Patterns to Avoid

| ❌ Anti-pattern | ✅ Correct approach |
|----------------|---------------------|
| `"use client"` at the page level calling SWR/useSWR | Server Component page with `<Suspense>` + inline async data-fetcher |
| Fetching reference data client-side (airlines, airports, etc.) | Server action with `"use cache"` — reference data rarely changes |
| Data-fetching hooks inside client components (`useFlightReferenceData`, `useSWR` in components) | Fetch at Layer 2, pass as props to Layer 3 |
| Single monolithic `"use client"` page with mixed fetching + state + rendering | Split into Layers 2 (fetch) and 3 (render) |

---

## Architecture Overview

This is a **Next.js 16 App Router** application covering two domains: **fund management** (investments, balance sheet, transactions) and **flight tracking** (travel log, route map). It uses **Supabase** (Postgres + Auth) and is styled with **Tailwind CSS v4 + shadcn/ui** (Radix primitives).

### Data Fetching Strategy

1. **Server Components with `"use cache"`** — Reference data (airports, airlines, aircrafts), aggregate stats, GeoJSON routes, dashboard data, and news are fetched server-side. These actions live in feature-specific `actions/` directories and use `cacheTag()` + `cacheLife("days")`. Revalidation via `/api/revalidate`.

2. **Client-side SWR hooks** — Balance sheet, cash assets, and currency rates use SWR hooks in `src/hooks/`. Configured with `revalidateOnFocus: false` and long deduping intervals. **Note:** SWR is for data that is inherently per-user and changes frequently. Consider whether a SWR hook can be converted to a server action before adding new ones.

3. **Client-side Infinite Query** — Paginated, filterable lists (flights history, transactions) use a custom `useInfiniteQuery` hook (`src/hooks/use-infinite-query.ts`) with `useSyncExternalStore`. The store recreates when `trailingQueryKey` changes. This hook is inherently client-only — the page should still fetch any reference data at Layer 2.

### Supabase Clients

| Client | File | Use case |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` | Client Components and SWR hooks |
| Server | `src/lib/supabase/server.ts` | Server Components and `"use cache"` actions |
| Admin | `src/lib/supabase/admin.ts` | Server-only operations with service_role bypassing RLS |

The browser and server clients use the **publishable key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The admin client uses the **secret key** (`SUPABASE_SECRET_KEY`) and throws if imported client-side.

The `flight` schema is used for flight-related tables; all fund-related tables are in the `public` schema.

### Auth

- **Auth proxy**: `src/proxy.ts` is the Next.js middleware entry point. It checks session cookies via `@supabase/ssr` and redirects unauthenticated users to `/login`. The matcher excludes `api`, static files, and images.
- **Login page**: `src/app/auth/login/` — uses the browser Supabase client with `signInWithPassword`.
- **Logout**: Triggered from the sidebar via `supabase.auth.signOut()`.

### Cache Invalidation

`/api/revalidate` accepts a POST with `{ tags: ["analytics", "flights", "news"] }` and an `x-revalidate-secret` header. Only `analytics`, `flights`, and `news` tags are whitelisted. Called by Supabase database webhooks when underlying tables change.

### External API: DNSE Broker

`src/lib/dnse/` integrates with a Vietnamese stock broker API (`api.dnse.com.vn`). Auth uses token-based login with shared-promise deduplication to prevent concurrent logins (8-hour token expiry). Exposed via API routes under `/api/dnse/`.

### Key Libraries

- **shadcn/ui** with `radix-luma` style, `zinc` base color, CSS variables, Lucide icons
- **Recharts** for chart components (area, pie, stacked bar — wrapped in `src/components/charts/`)
- **react-leaflet** + Leaflet for the flight route map (SSR-disabled via `next/dynamic`)
- **React Hook Form** + Zod for form validation (schemas live next to forms, e.g., `form/schema.ts`)
- **SWR** for client-side data fetching (legacy — prefer server actions for new work)
- **date-fns** for date manipulation
- **yahoo-finance2** for market data

### Styling Conventions

- Tailwind CSS v4 with `@import "tailwindcss"` (no `tailwind.config.ts`)
- Dark mode only — `<html>` has `className="dark"` hardcoded in root layout
- CSS custom properties in `:root` and `.dark` selectors in `globals.css`
- shadcn/ui component className merging via `cn()` from `@/lib/utils`

### Project Conventions

- `@/` path alias maps to `src/`
- `"use client"` directive on all components that use hooks, browser APIs, or the Supabase browser client
- Form components: schema (Zod) → form (React Hook Form) → field components
- Feature hooks co-located in `hooks/` within the feature folder; global hooks (`src/hooks/`) cover cross-cutting concerns only
- Number formatting: `formatNum()` and `compactNum()` from `src/lib/utils.ts` (cached `Intl.NumberFormat` instances)
- Container layout: `@container/main flex flex-1 flex-col gap-2 pb-4` wrapping content
