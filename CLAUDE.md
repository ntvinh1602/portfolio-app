# CLAUDE.md

Reference for working in this codebase. Organized by layer and domain — use this to understand conventions, locate code, and apply established patterns.

## Build Commands

```bash
npm run dev        # Next.js dev server (turbo mode)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run gen-types  # Regenerate Supabase types from local DB
```

## Architecture

Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui (radix-luma style, zinc base). Supabase provides Postgres, Auth, and Edge Functions. Dark mode only, Manrope font via `next/font/google`.

### Layer Map

```
src/
  app/                Thin page orchestrators — server components, <Suspense> boundaries
  features/{domain}/  Domain logic — actions, components, forms, hooks, types, config
  components/         Shared UI — ui/, charts/, filter/, form/, sidebar/, skeletons/
  hooks/              Shared hooks — useInfiniteQuery, useMobile
  lib/                Infrastructure — supabase/, utils.ts
  types/              Global types — database.types.ts, global.types.ts
```

### Domain-Driven Design

Each domain under `src/features/` is self-contained:

```
features/{domain}/
  actions/           Server actions — cached reads and mutations
  components/        Client components — subfolders per feature area
  form/              Domain forms — Zod schema + React Hook Form component
  hooks/             Domain-specific hooks (filter state, etc.)
  config.tsx         Static config — chart definitions, filter options, display constants
  {domain}.types.ts  Domain TypeScript types
```

**Fund domain** (`src/features/fund/`): Dashboard, performance, transactions, balance sheet. Uses `public` DB schema. Also has `memo.ts` (predefined cashflow memo labels).

**Flights domain** (`src/features/flights/`): Route map, flight history. Uses `flight` DB schema.

**Auth** (`src/features/auth/`): A simpler domain — no separate DB schema, no server actions or hooks. Contains just the login and forgot-password form components that call `supabase.auth` directly from the browser client.

### Path Aliases

```
@/           → src/
@flight/*    → src/features/flights/*
@fund/*      → src/features/fund/*
@auth/*      → src/features/auth/*
```

## Data Fetching

### Cached Server Actions (reads)

All read-only data fetching uses cached server actions. Pattern:

```tsx
// src/features/flights/actions/get-airports.ts
import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

type AirportRow = Database["flight"]["Tables"]["airports"]["Row"]
export type Airport = { [K in keyof AirportRow]: NonNullable<AirportRow[K]> }

export default async function getAirports() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airports")
    .select("id, iata_code, name, lat, lng")

  if (error) throw new Error(error.message)
  return data as Airport[]
}
```

Rules:
- `"use cache: private"` as the first statement in the function body
- `cacheTag()` with a whitelisted tag: `"analytics"`, `"flights"`, or `"news"`
- `cacheLife("days")` for reference data; shorter lifetimes where appropriate
- Default export for cached reads; named exports for mutations
- Export the function as default; export the return type alongside it
- Use `createClient()` from `@/lib/supabase/server` (never the browser client)
- Throw on error — the `<Suspense>` boundary handles it

### Mutations

Write operations use `"use server"` and call Supabase RPC functions:

```tsx
// src/features/flights/actions/add-flight.ts
"use server"

export async function AddFlight(values: FlightFormValues) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .rpc("insert_flight_with_timezone", { ... })
  if (error) throw new Error(error.message)
  return data
}
```

Mutations are called from client-side form submit handlers. After success, call `onSuccess?.()` (closes the dialog) and `triggerRefresh?.()` (invalidates any active infinite queries).

Some mutations use the browser Supabase client directly from form components (e.g., `StockForm` calls `supabase.rpc("add_stock_event")`). Both patterns are valid — the browser client is acceptable for mutations inside `"use client"` form components.

### Client-Side Infinite Query

For paginated, filterable lists (flight history, transactions), use `useInfiniteQuery` from `src/hooks/use-infinite-query.ts`. This hook uses `useSyncExternalStore` with a custom store that manages `data`, `count`, `isLoading`, `isFetching`, `hasMore`, `error`, and `fetchNextPage`. The store is recreated when `trailingQueryKey` changes.

Paired with `InfiniteList` from `src/components/infinite-list.tsx` which provides scroll-based loading, loading/empty/error states, and an end-of-list message.

### Legacy: SWR

Some older components use SWR. Prefer server actions for new server data and `useInfiniteQuery` for new paginated lists.

## Page Patterns

Pages in `src/app/` are thin server components. There are three variations depending on data needs.

### Pattern A: Multiple Independent Data Sources

Each data source gets its own `<Suspense>` boundary so they stream independently. The exported page wraps inline async data-fetcher functions.

```tsx
// src/app/flights/map/page.tsx
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

Used in: `/flights/map`, `/fund/dashboard`

### Pattern B: Reference Data Before Client Render

When a client component needs reference data (option lists for filters and forms), fetch it all server-side and pass as props. Single `<Suspense>` boundary.

```tsx
// src/app/flights/history/page.tsx
export default function FlightsHistoryPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FlightsListData />
    </Suspense>
  )
}

async function FlightsListData() {
  const [airlines, aircrafts, airports] = await Promise.all([
    getAirlines(),
    getAircrafts(),
    getAirports(),
  ])

  // Transform into option shapes on the server
  const airlineFilterOptions = airlines.map(a => ({ label: a.name, value: a.name }))
  const airlineFormOptions = airlines.map(a => ({ label: a.name, value: a.id }))
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
      startYear={2019}
      airlineFormOptions={airlineFormOptions}
      aircraftFormOptions={aircraftFormOptions}
      airportFormOptions={airportFormOptions}
    />
  )
}
```

Used in: `/flights/history`

### Pattern C: Fully Client-Driven

When there is no server data to pre-fetch — the client component handles its own data via `useInfiniteQuery`.

```tsx
// src/app/fund/transactions/page.tsx
export default function TransactionsPage() {
  return <TransactionsClient />
}
```

Used in: `/fund/transactions`

### Inline Data-Fetcher Rules

Functions defined below the page (not exported, file-private):
- Call cached server actions
- Transform raw data into prop shapes (option arrays, computed values)
- Pass resolved data to client components
- Never contain complex JSX — delegate to client components
- May include a debug skeleton delay behind `NEXT_PUBLIC_DEBUG_SKELETON === "1"`

## Form Pattern

All forms follow: Zod schema → React Hook Form → shared field components.

### File Layout

```
features/{domain}/form/
  schema.ts         # Zod schema + inferred type export
  {entity}Form.tsx   # React Hook Form component
```

### Schema

```tsx
// src/features/fund/form/schema.ts
import * as z from "zod"

export const stockSchema = z.object({
  side: z.enum(["buy", "sell"]),
  ticker: z.string().min(1, "Select a stock"),
  price: z.coerce.number().int().positive("Must be positive"),
  quantity: z.coerce.number().int().positive("Must be positive"),
  // ...
})

export type StockFormValues = z.infer<typeof stockSchema>
```

Conventions:
- `z.coerce.number()` for numeric fields (handles string-to-number from HTML inputs)
- `.int()`, `.positive()`, `.min(0)` for value constraints
- `z.enum()` for fixed option sets
- `.refine()` for cross-field validation
- `.transform()` for normalization (e.g., `.toUpperCase()` on flight numbers)

### Form Component (Dialog Integration)

Forms designed for `FormDialogWrapper` accept these props:

```tsx
interface FormComponentProps {
  onSuccess?: () => void
  formId: string              // attaches dialog footer submit button to form
  onLoadingChange: (loading: boolean) => void  // controls submit button disabled state
  resetFormRef: { current: () => void }         // exposes form.reset() to dialog's Reset button
}
```

The form sets `<form id={formId}>` with no internal submit button. The dialog footer provides Submit (bound via `form={FORM_ID}`) and Reset buttons.

Reference: `src/features/fund/form/stockForm.tsx`

### Form Component (Standalone)

Forms not in dialogs manage their own submit button and loading state internally. Accept just `onSuccess?` plus reference data props.

Reference: `src/features/flights/form/flightsForm.tsx`

### Shared Form Field Components

Located in `src/components/form/`. Each wraps a shadcn/ui input via React Hook Form's `Controller`:

- `TextField` — text input
- `NumberField` — number input with optional suffix addon
- `SelectField` — dropdown with `{ value, label }` options
- `ComboboxField` — searchable combobox for large option lists
- `RadioGroupField` — radio button group for enumerated choices
- `DateTimeField` — datetime-local input with Calendar + time picker

### Dialog Wrappers

`FormDialogWrapper` (`src/components/form/form-wrapper.tsx`): Wraps a form component in a dialog with title, subtitle, and Submit/Reset footer buttons. Uses `FORM_ID = "dialog-form"` constant.

`DialogFormWrapper` (`src/components/form/dialog-form-wrapper.tsx`): Simpler variant for forms that handle their own submit and loading internally.

## Filter + Infinite Query Pattern

Used for paginated, filterable lists. Three parts:

### 1. Filter Hook

Domain filter hooks in `features/{domain}/hooks/` manage filter state and compute query-building callbacks:

```tsx
const { filters, setFilters, trailingQuery, trailingQueryKey, triggerRefresh }
  = useFlightsFilters()
```

The hook returns:
- `filters` / `setFilters` — filter state (year, airline, seat types, search text, etc.)
- `trailingQuery` — callback that modifies a Supabase query builder with filters, ordering, and limits
- `trailingQueryKey` — JSON-stringified representation of filters; changing it recreates the `useInfiniteQuery` store
- `triggerRefresh` — increments a counter to force store recreation after a mutation

Reference: `src/features/flights/hooks/use-flights-filters.ts`, `src/features/fund/hooks/use-transaction-filters.ts`

### 2. Infinite Query

The `useInfiniteQuery` hook receives `trailingQuery` and `trailingQueryKey`:

```tsx
const { data, count, isLoading, isFetching, hasMore, error, fetchNextPage }
  = useInfiniteQuery<Flight>({
    table: "flights_readable",
    columns: "...",
    pageSize: 20,
    schema: "flight",
    trailingQuery,
    trailingQueryKey,
  })
```

### 3. InfiniteList

`InfiniteList` (`src/components/infinite-list.tsx`) wraps the list items and handles scroll-based loading:

```tsx
<InfiniteList
  hasMore={hasMore}
  isFetching={isFetching}
  isLoading={isLoading}
  count={count}
  error={error}
  fetchNextPage={fetchNextPage}
>
  {data.map(item => <FlightItem key={item.id} flight={item} />)}
</InfiniteList>
```

It renders loading spinners, empty states, error states, and "All N items loaded" messages automatically.

### Shared Filter Components

Located in `src/components/filter/`:

- `FilterCard` — container with label and optional reset button
- `FilterSelect` — single-select dropdown with icon, "All" toggle
- `FilterToggleGroup` — multi-select toggle group (e.g., seat types, transaction categories)
- `FilterSearch` — text search with Enter/button commit

## Chart Pattern

Chart components are Recharts wrappers in `src/components/charts/`.

### Chart Components

- `Areachart` — area chart with gradient fills, legends, axis formatters
- `Piechart` — pie/donut with optional center text, configurable legend position
- `ChartBarStacked` — horizontal stacked bar chart with compact number formatting

All accept `data`, `config` (ChartConfig), and domain-specific axis/tooltip formatters.

### Chart Config

Domain chart configs live in `features/{domain}/config.tsx` using CSS variable colors:

```tsx
// src/features/fund/config.tsx
export const assetChart: ChartConfig = {
  cash: { label: "Cash", color: "var(--chart-1)" },
  stock: { label: "Stock", color: "var(--chart-2)" },
  fund: { label: "Fund", color: "var(--chart-3)" },
}
```

Colors reference CSS variables `--chart-1` through `--chart-5` defined in `globals.css`.

### Chart Card Header

`ChartCardHeader` (`src/components/charts/chartcard-header.tsx`) provides a standard card header with title, hero stat, and two sub-stats with trend icons.

### Skeleton Co-Exports

Many fund dashboard components export a `*Skeleton` variant alongside the component (e.g., `Portfolio` + `PortfolioSkeleton`, `NewsWidget` + `NewsSkeleton`). Shared skeleton components are in `src/components/skeletons/` (`chart-card.tsx`, `item.tsx`).

## Compound Component Families

Three compound component families provide consistent layout primitives. All in `src/components/ui/`.

### Item

For list items and stat displays. `Item`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemMedia`, `ItemGroup`, `ItemSeparator`, plus header/footer/actions subcomponents. Variants: `default`, `outline`, `muted`. Sizes: `default`, `sm`, `xs`.

Used in flight items, transaction items, asset items, chart stat displays, and news article cards.

### Field

For form field layout and metadata. `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`, plus content/title/set/legend/separator subcomponents. Orientations: `vertical`, `horizontal`, `responsive`.

Used in all form field wrappers and filter components.

### Empty

For empty-state displays. `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`. Media variants: `default`, `icon`.

Used in `InfiniteList`, `StatusLabel`, and any component that needs an empty state.

## Supabase Infrastructure

### Clients

Three client variants in `src/lib/supabase/`, all using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:

| Client | File | Use |
|--------|------|-----|
| Browser | `client.ts` | Client Components — `createBrowserClient()` from `@supabase/ssr` |
| Server | `server.ts` | Server Components and `"use cache"` actions — `createServerClient()` with cookie `getAll`/`setAll` |
| Proxy | `proxy.ts` | Auth middleware — `createServerClient()` with `getClaims()`, redirects unauthenticated users to `/auth/login` |

### Database Schemas

- **`public`** (fund): `assets`, `tx_entries`, `tx_cashflow`, `tx_stock`, `tx_debt`, `tx_legs`, `asset_positions`, `currencies`, `historical_prices`, `historical_fxrate`, `dnse_orders`, `news_articles`
- **`flight`** (flights): `airlines`, `airports`, `aircrafts`, `flights`

Key views and materialized views: `balance_sheet`, `daily_snapshots` (materialized), `dashboard_data` (materialized), `recaps_data` (materialized), `monthly_snapshots`, `yearly_snapshots`, `stock_holdings`, `outstanding_debts`, `stock_annual_pnl`, `tx_summary`, `flights_readable`, `routes_geojson`, `lifetime_stats`.

Business logic lives in Postgres RPC functions: `add_stock_event`, `add_cashflow_event`, `add_borrow_event`, `add_repay_event`, `insert_flight_with_timezone`, `calculate_pnl`, `calculate_twr`, `get_equity_chart`, `get_return_chart`, `rebuild_ledger`, `process_dnse_order`, `process_refresh_queue`, `revalidate_news`.

### Cache Invalidation

`/api/update` (POST) accepts `{ tags: ["analytics", "flights", "news"] }` with `x-update-secret` header. Only these three tags are whitelisted. Uses `updateTag()` from `next/cache` to purge cached server actions.

Trigger flow: DB trigger → `net.http_post` to `/api/update` → `updateTag()` → next request re-fetches.

### Edge Functions

Deno functions in `supabase/functions/`, invoked by `pg_cron`:

- **`fetch-yahoofinance`** — fetches stock/index prices from Yahoo Finance, upserts into `historical_prices`
- **`fetch-exchange-rates`** — fetches FX rates from OpenExchangeRates, upserts into `historical_fxrate`
- **`upsert-dnse-orders`** — syncs filled orders from DNSE brokerage API into `dnse_orders` (a DB trigger then calls `process_dnse_order`)
- **`ingest-news`** — parses Vietnamese finance RSS feeds (VnEconomy, Vietnambiz), extracts stock tickers, validates against `assets` table, upserts into `news_articles` (with `related_stocks` text array column). Uses `withSupabase({ auth: 'secret' })` for service-to-service auth via `pg_cron`

### Migrations and Seeds

Migrations in `supabase/migrations/`. Apply with `supabase db push`. After schema changes, run `npm run gen-types` to regenerate `src/types/database.types.ts`.

Seeds in `supabase/.seeds/` — `users.sql` for auth users, `data.sql` for domain data.

## Auth

Middleware entry at `src/proxy.ts` — exports a `proxy()` function (Next.js 16 convention). Calls `updateSession()` from `@/lib/supabase/proxy` which validates cookies via `supabase.auth.getClaims()`. Unauthenticated users are redirected to `/auth/login`. The matcher excludes `api`, static files, and images.

Auth forms in `src/features/auth/`:
- `login-form.tsx` — `signInWithPassword` via browser Supabase client
- `forgot-password-form.tsx` — `resetPasswordForEmail` via browser Supabase client

Logout is triggered from `AppSidebar` (`src/components/sidebar/app-sidebar.tsx`) via a `ConfirmDialog` wrapping `supabase.auth.signOut()`.

The auth domain is simpler than Fund or Flights — no separate DB schema, no server actions, no cache tags.

## Styling Conventions

- Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css` — no `tailwind.config.ts`
- Dark mode only — `<html className="dark">` hardcoded in root layout
- CSS custom properties in `:root` and `.dark` selectors define the token system
- shadcn/ui components use `radix-luma` style, `zinc` base color
- `cn()` from `@/lib/utils` merges class names (clsx + tailwind-merge)
- Number formatting: `formatNum(amount, fractionDigits?, currency?)` and `compactNum(amount)` use cached `Intl.NumberFormat` instances
- `@container/main` utility for container queries on content wrappers

## Adding a New Domain

When extending the app with a third domain:

1. Create `src/features/{domain}/` with `actions/`, `components/`, `form/`, `hooks/`, `config.tsx`, `{domain}.types.ts`
2. Add a path alias in `tsconfig.json` (`@{domain}/* → src/features/{domain}/*`)
3. Create a database schema if the domain needs data isolation (or reuse `public`)
4. Add page routes in `src/app/{domain}/` with a `layout.tsx` wrapping `MainLayout`
5. Whitelist any new cache tags in `/api/update`
6. Add nav entries to `AppSidebar` (`src/components/sidebar/app-sidebar.tsx`)
7. Follow the established patterns: cached server actions for reads, `useInfiniteQuery` for paginated lists, Zod + React Hook Form for forms

## Anti-Patterns

- Do not put `"use client"` on pages that can be server components
- Do not fetch reference data client-side — use cached server actions (airlines, airports, assets are reference data)
- Do not create new data-fetching hooks — use server actions for reads, `useInfiniteQuery` for paginated lists
- Do not inline complex JSX in data-fetcher functions — delegate to client components
- Do not bypass the form pattern — new forms should use Zod schemas, React Hook Form, and shared field components
- Do not create a new Supabase client pattern — use one of the three existing clients
- Do not hardcode cache tag names in server actions — reference the whitelisted set in `/api/update`
