-- supabase/migrations/20250808094900_enable_rls_for_market_data.sql

-- Enable Row Level Security for the live_stock_prices table
ALTER TABLE public.live_stock_prices ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to the live_stock_prices table
CREATE POLICY "Allow public read access to live prices"
ON public.live_stock_prices
FOR SELECT
TO public
USING (true);