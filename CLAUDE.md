# CLAUDE.md

Reference for working in this codebase. Organized by layer and domain — use this to understand conventions, locate code, and apply established patterns.

## Build Commands

```bash
npm run dev        # Next.js dev server (turbo mode)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run sbtypes    # Regenerate Supabase types from local DB
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

### Path Aliases

```
@/           → src/
@flight/*    → src/features/flights/*
@fund/*      → src/features/fund/*
@auth/*      → src/features/auth/*
```

### Client-Side Infinite Query

For paginated, filterable lists (flight history, transactions), use `useInfiniteQuery` from `src/hooks/use-infinite-query.ts`. This hook uses `useSyncExternalStore` with a custom store that manages `data`, `count`, `isLoading`, `isFetching`, `hasMore`, `error`, and `fetchNextPage`. The store is recreated when `trailingQueryKey` changes.

Paired with `InfiniteList` from `src/components/infinite-list.tsx` which provides scroll-based loading, loading/empty/error states, and an end-of-list message.

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

## Component Composition Patterns

Follow these patterns when building new feature components. Derived from [Vercel's React composition patterns](https://github.com/vercel/composition-patterns) and [React best practices](https://github.com/vercel/react-best-practices).

### Section / Presentation Split

Each dashboard widget follows a two-file split. The **section** owns data fetching and state; the **presentation** component owns pure rendering. Presentation components accept `children` or typed props — never call hooks or fetch data.

```
features/{domain}/components/{feature}/
  {feature}-section.tsx   # "use client" — data hook, loading/error/null guards, passes to presentation
  {feature}.tsx            # pure rendering — Card shell, accepts children or typed props
```

**Section** (`top-stocks-section.tsx`):
- `"use client"` — calls data hooks (SWR), reads context
- Handles loading / error / empty states (returns `StatusLabel` or skeleton)
- Transforms raw data (sort, filter, slice) via memoized hooks
- Passes clean data to the presentation component

**Presentation** (`top-stocks.tsx`):
- Server component by default (no `"use client"` unless it uses hooks)
- Accepts `children` or typed props — never boolean flags
- Composes shared UI primitives (Card, Item, Empty)

Reference: `src/features/fund/components/performance/top-stocks-section.tsx` + `top-stocks.tsx`

### Custom Hooks for Derived Data

Extract data transformations into custom hooks with `useMemo`. This decouples *how* data is computed from *how* it's rendered.

```tsx
function useTopPerformers(data: StockPnl[] | undefined) {
  return useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.total_pnl - a.total_pnl).slice(0, 10)
  }, [data])
}
```

**Critical — Rules of Hooks**: Call derived-data hooks **before** any conditional early return. The hook must execute in the same order on every render.

```tsx
// ✅ CORRECT — hook before early returns
export function TopStocksSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useStockPnl(year)
  const topPerformers = useTopPerformers(data) // always called

  if (isLoading) return <StatusLabel type="loading" />
  if (error) return <StatusLabel type="error" />
  if (!data) return null
  // ...
}

// ❌ WRONG — hook after early returns; hook count changes between renders
export function TopStocksSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useStockPnl(year)

  if (isLoading) return <StatusLabel type="loading" />
  if (!data) return null
  const topPerformers = useTopPerformers(data) // skipped on loading render!
}
```

### Children over Render Props

Use `children` for composition instead of `renderX` props. Children compose naturally and avoid callback signatures.

```tsx
// ✅ CORRECT — children for composition
<TopStocks>
  <div className="flex flex-col gap-2">
    {items.map(item => <AssetItem key={item.id} {...item} />)}
  </div>
</TopStocks>

// ❌ WRONG — render props
<TopStocks renderItems={(items) => items.map(...)} />
```

### Static JSX Hoisting

Hoist static JSX to module scope so React reconciliation can skip the subtree on re-renders.

```tsx
// ✅ CORRECT — hoisted to module scope
const topStocksHeader = (
  <CardHeader>
    <CardTitle>Best Performers</CardTitle>
    <CardAction><Trophy /></CardAction>
  </CardHeader>
)

export function TopStocks({ children }: { children: React.ReactNode }) {
  return <Card>{topStocksHeader}<CardContent>{children}</CardContent></Card>
}
```

### React 19: `use()` over `useContext()`

In React 19, use `use()` to read context. It handles synchronous context values identically to `useContext()`.

```tsx
// ✅ CORRECT — React 19
import { createContext, useState, use } from "react"

export function usePerformanceYear() {
  const ctx = use(PerformanceYearContext)
  if (!ctx) throw new Error("must be used within provider")
  return ctx
}
```

### React 19: `useState` Lazy Initializer over `useEffect` Bootstrap

Use the lazy initializer form of `useState` instead of `useState(null)` + `useEffect` to set the initial value. This eliminates the null render pass.

```tsx
// ✅ CORRECT — single render with valid value
const [year, setYear] = useState<number>(() => new Date().getFullYear())

// ❌ WRONG — double render: first null, then useEffect fires, then real value
const [year, setYear] = useState<number | null>(null)
useEffect(() => { setYear(new Date().getFullYear()) }, [])
```

**Prerendering**: If the lazy initializer uses `new Date()` or other unstable values, wrap the component in `<Suspense>` on the server page so Next.js can statically prerender:

```tsx
// page.tsx
export default function Page() {
  return (
    <Suspense>
      <PerformanceYearProvider startYear={2021}>
        <Performance />
      </PerformanceYearProvider>
    </Suspense>
  )
}
```

### When NOT to Use Compound Components

A compound component (with its own context) is only warranted when subcomponents need to share **implicit state** (e.g., `Tabs` + `TabList` + `TabPanel` sharing the active tab index). A component that receives dynamic content as `children` and wraps it in a layout shell does **not** need its own context. Adding one is unnecessary indirection.

### No Boolean Props

Don't add boolean props to customize behavior (`isEditing`, `showHeader`, `variant`). Each boolean doubles possible states. Use composition or explicit variant components instead.

```tsx
// ✅ CORRECT — explicit variant components
function ThreadComposer({ channelId }: { channelId: string }) { /* ... */ }
function EditComposer({ messageId }: { messageId: string }) { /* ... */ }

// ❌ WRONG — boolean prop proliferation
function Composer({ isThread, isEditing, isForwarding }: Props) { /* ... */ }
```

## Supabase Infrastructure

### Clients

Three client variants in `src/lib/supabase/`, all using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:

| Client | File | Use |
|--------|------|-----|
| Browser | `client.ts` | Client Components — `createBrowserClient()` from `@supabase/ssr` |
| Server | `server.ts` | Server Components and `"use cache"` actions — `createServerClient()` with cookie `getAll`/`setAll` |
| Proxy | `proxy.ts` | Auth middleware — `createServerClient()` with `getClaims()`, redirects unauthen

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

## Important Rules
- This file might contain outdated data. If encounter discrepancy, ask user for confirmation on latest conventions.
- When making changes other than UI or styling, always make sure to follow best practices of Next/Vercel and React.
