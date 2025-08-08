
-- Create the table for market data
CREATE TABLE public.live_stock_prices (
    symbol TEXT PRIMARY KEY,
    match_price REAL NOT NULL,
    match_quantity BIGINT NOT NULL,
    side TEXT,
    sending_time TIMESTAMPTZ
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.live_stock_prices ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows public read access
CREATE POLICY "Authenticated users can read live stock prices" ON public.live_stock_prices
    FOR SELECT
    to authenticated
    USING (true);

-- Enable Realtime on the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stock_prices;