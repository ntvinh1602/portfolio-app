# Portfolio Tracker

A personal finance dashboard for tracking investments, liabilities, and net worth over time — plus a flight log for travel history.

Built with **Next.js 16** on **Supabase**, styled with **Tailwind CSS v4** and **shadcn/ui**, and visualized with **Recharts** and **Leaflet**.

## Features

### Fund Management
- **Dashboard** — equity curve, time-weighted returns, portfolio composition, net profit, and market news
- **Balance Sheet** — assets, liabilities, and equity broken down by class and ticker
- **Transactions** — double-entry bookkeeping for stock trades, cashflow events, borrows, and repayments, with date-range filtering
- **Annual Recaps** — year-over-year P&L, top-performing stocks, expense breakdown, deposits/withdrawals, and return benchmarks

### Flight Tracking
- **History** — filterable log of past flights by airline, aircraft, airport, and year
- **Map** — Leaflet-powered route map with aggregate stats (destinations, distance, countries, aircraft models)

### Platform
- Supabase Auth with login page
- Dark mode (persisted, defaults to system preference)
- Responsive layout with mobile support
- Search-engine indexing disabled

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack) |
| Language | TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Forms | React Hook Form + Zod |
| Data fetching | SWR + Server Components |
| Market data | yahoo-finance2 |
| Storage | Vercel Blob |

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase project URL and keys

# Start the dev server
pnpm dev
```

The app runs on `http://localhost:3000` and proxies API requests through Next.js route handlers to Supabase.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Project Structure

```
src/
├── app/
│   ├── fund/                  # Fund management pages
│   │   ├── dashboard/         # Portfolio overview
│   │   ├── balance-sheet/     # Assets, liabilities, equity
│   │   ├── transactions/      # Trade & cashflow entries
│   │   └── annual-recaps/     # Year-over-year performance
│   ├── flights/               # Flight tracking pages
│   │   ├── history/           # Flight log
│   │   └── map/               # Route map
│   ├── login/                 # Auth page
│   └── api/                   # Route handlers
├── components/                # Shared UI components
├── hooks/                     # Client-side data hooks (SWR)
├── lib/                       # Server utilities, Supabase client
└── types/                     # TypeScript type definitions
```
