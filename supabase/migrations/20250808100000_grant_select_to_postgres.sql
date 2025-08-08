-- supabase/migrations/20250808100000_grant_select_to_postgres.sql

-- Grant SELECT permission on the live_stock_prices table to the postgres role
GRANT SELECT ON TABLE public.live_stock_prices TO postgres;