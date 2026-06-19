-- =============================================================================
-- Schema Audit Fixes: FK indexes + unused index cleanup + missing RLS policy
-- Based on Supabase Postgres Best Practices audit 2026-06-19
-- =============================================================================

-- 1. FK indexes on flight.flights (4 missing)
-- Every flights_readable view query JOINs all four FK columns
create index if not exists flights_airline_id_idx on flight.flights (airline_id);
create index if not exists flights_aircraft_id_idx on flight.flights (aircraft_id);
create index if not exists flights_departure_airport_id_idx on flight.flights (departure_airport_id);
create index if not exists flights_arrival_airport_id_idx on flight.flights (arrival_airport_id);

-- 2. FK indexes on public schema (5 missing)
create index if not exists assets_currency_code_idx on public.assets (currency_code);
create index if not exists dnse_orders_symbol_idx on public.dnse_orders (symbol);
create index if not exists news_article_assets_asset_id_idx on public.news_article_assets (asset_id);
create index if not exists tx_cashflow_asset_id_idx on public.tx_cashflow (asset_id);
create index if not exists tx_stock_stock_id_idx on public.tx_stock (stock_id);

-- 3. Composite index for flights chronological listing (the view's ORDER BY)
create index if not exists flights_departure_time_idx on flight.flights (departure_time desc);

-- 4. Drop unused GiST index on airports.geom
-- Only 14 rows, no spatial queries — index never used, just wastes writes
drop index if exists flight.airports_geom_idx;

-- 5. Add RLS policy to refresh_queue so it's accessible
-- RLS was enabled but no policies existed, making the table invisible to all roles
create policy "Auth users can read refresh_queue"
  on public.refresh_queue
  for select
  to authenticated
  using (true);

create policy "Auth users can insert into refresh_queue"
  on public.refresh_queue
  for insert
  to authenticated
  with check (true);
