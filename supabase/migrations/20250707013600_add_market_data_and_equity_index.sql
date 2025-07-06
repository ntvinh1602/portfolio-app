CREATE TABLE IF NOT EXISTS public.market_data (
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    close NUMERIC,
    PRIMARY KEY (date, symbol)
);

ALTER TABLE public.daily_performance_snapshots
ADD COLUMN IF NOT EXISTS equity_index NUMERIC;