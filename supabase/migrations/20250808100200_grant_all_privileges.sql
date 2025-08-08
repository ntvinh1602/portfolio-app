-- supabase/migrations/20250808100200_grant_all_privileges.sql

-- Grant all privileges on the live_stock_prices table to the postgres and anon roles
GRANT ALL ON TABLE public.live_stock_prices TO postgres;
GRANT ALL ON TABLE public.live_stock_prices TO anon;