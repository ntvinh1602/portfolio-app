SET check_function_bodies = false;
CREATE FUNCTION public.upsert_historical_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.historical_prices (asset_id, date, close)
  SELECT
    a.id,
    -- Use last_updated if available, fall back to bar_time
    (NEW.last_updated AT TIME ZONE 'UTC')::date,
    NEW.close * 1000
  FROM public.assets a
  WHERE a.ticker = NEW.symbol
  ON CONFLICT (asset_id, date)
  DO UPDATE SET
    close = EXCLUDED.close;

  RETURN NULL;
END;
$function$;
GRANT ALL ON FUNCTION public.upsert_historical_prices() TO anon;
GRANT ALL ON FUNCTION public.upsert_historical_prices() TO authenticated;
GRANT ALL ON FUNCTION public.upsert_historical_prices() TO service_role;
CREATE TRIGGER trg_upsert_historical_prices AFTER INSERT ON public.ohlc_bars FOR EACH ROW EXECUTE FUNCTION public.upsert_historical_prices();
