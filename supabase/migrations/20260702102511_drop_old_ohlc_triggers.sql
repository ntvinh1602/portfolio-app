DROP TRIGGER trg_upsert_historical_prices ON public.ohlc_bars;
DROP TABLE public.ohlc_bars;
CREATE TABLE public.m1_intraday_close (symbol text NOT NULL, close numeric NOT NULL, volume bigint NOT NULL, last_updated timestamp with time zone NOT NULL, received_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.m1_intraday_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m1_intraday_close ADD CONSTRAINT m1_intraday_close_pkey PRIMARY KEY (symbol, last_updated);
GRANT ALL ON public.m1_intraday_close TO service_role;
CREATE TRIGGER trg_upsert_historical_prices AFTER INSERT ON public.m1_intraday_close FOR EACH ROW EXECUTE FUNCTION public.upsert_historical_prices();
