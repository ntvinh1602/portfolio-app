-- Drop the existing constraint if it exists
ALTER TABLE public.daily_stock_prices DROP CONSTRAINT IF EXISTS security_daily_prices_pkey;

-- Add the correct primary key constraint
ALTER TABLE public.daily_stock_prices ADD CONSTRAINT daily_stock_prices_pkey PRIMARY KEY (security_id, date);