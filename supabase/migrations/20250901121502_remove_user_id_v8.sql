CREATE OR REPLACE FUNCTION public.refresh_performance_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  PERFORM public.generate_performance_snapshots(NEW.date, CURRENT_DATE);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_after_new_fx_rate ON public.daily_exchange_rates;
DROP TRIGGER IF EXISTS snapshot_after_new_stock_price ON public.daily_stock_prices;
DROP TRIGGER IF EXISTS snapshot_after_new_transaction ON public.transaction_legs;

drop function if exists "public"."handle_new_exchange_rate"();
drop function if exists "public"."handle_new_stock_price"();
drop function if exists "public"."handle_new_transaction"();

CREATE TRIGGER snapshot_after_new_txn
AFTER INSERT OR UPDATE ON public.transaction_legs
FOR EACH ROW
EXECUTE FUNCTION refresh_performance_snapshots();

CREATE TRIGGER snapshot_after_new_fx_rate
AFTER INSERT OR UPDATE ON public.daily_exchange_rates
FOR EACH ROW
EXECUTE FUNCTION refresh_performance_snapshots();

CREATE TRIGGER snapshot_after_new_stock_price
AFTER INSERT OR UPDATE ON public.daily_stock_prices
FOR EACH ROW
EXECUTE FUNCTION refresh_performance_snapshots();