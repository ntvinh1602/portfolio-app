# Logbook

A personal finance dashboard for tracking investments, liabilities, and net worth over time — plus a flight log for travel history.

Built with **Next.js 16** on **Supabase**, styled with **Tailwind CSS v4** and **shadcn/ui**, and visualized with **Recharts** and **Leaflet**.

## Features

### Fund Management
- **Dashboard** — equity curve, time-weighted returns, portfolio composition, net profit, and market news
- **Balance Sheet** — assets, liabilities, and equity broken down by class and ticker
- **Performance** — year-over-year P&L, top-performing stocks, expense breakdown, deposits/withdrawals, and return benchmarks
- **Events** — double-entry bookkeeping for stock trades, cashflow events, borrows, and repayments, with date-range filtering

### Flight Tracking
- **History** — filterable log of past flights by airline, aircraft, airport, and year
- **Map** — Leaflet-powered route map with aggregate stats (destinations, distance, countries, aircraft models)

### Platform
- Supabase Auth with login page, password recovery
- Dark mode (persisted, defaults to system preference)
- Responsive layout with mobile support
- Search-engine indexing disabled
