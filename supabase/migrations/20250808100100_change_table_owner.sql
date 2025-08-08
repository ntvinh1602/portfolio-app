-- supabase/migrations/20250808100100_change_table_owner.sql

-- Change the owner of the live_stock_prices table to the postgres role
ALTER TABLE public.live_stock_prices OWNER TO postgres;