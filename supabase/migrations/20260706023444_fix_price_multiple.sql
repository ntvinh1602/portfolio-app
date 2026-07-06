SET check_function_bodies = false;
CREATE OR REPLACE FUNCTION public.upsert_historical_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$BEGIN
  INSERT INTO public.historical_prices (asset_id, date, close)
  SELECT
    a.id,
    -- Use last_updated if available, fall back to bar_time
    (NEW.last_updated AT TIME ZONE 'UTC')::date,
    NEW.close
  FROM public.assets a
  WHERE a.ticker = NEW.symbol
  ON CONFLICT (asset_id, date)
  DO UPDATE SET
    close = EXCLUDED.close;

  RETURN NULL;
END;$function$;
