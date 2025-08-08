-- supabase/migrations/20250808095700_reset_rls_policies.sql

-- Drop all existing policies on the live_stock_prices table
DROP POLICY IF EXISTS "Authenticated users can read live stock prices" ON public.live_stock_prices;