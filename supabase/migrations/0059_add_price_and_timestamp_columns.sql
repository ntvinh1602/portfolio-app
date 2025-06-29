ALTER TABLE public.assets
ADD COLUMN last_updated_price NUMERIC(10, 2);

ALTER TABLE public.profiles
ADD COLUMN last_stock_fetching TIMESTAMPTZ;