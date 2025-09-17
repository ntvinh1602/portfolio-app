CREATE OR REPLACE FUNCTION public.snapshots_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET "search_path" TO 'public'
AS $$
DECLARE
  v_date date;
BEGIN
  -- Try to get NEW.date if it exists
  BEGIN
    v_date := NEW.date;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist → try transaction_id lookup
      IF NEW.transaction_id IS NOT NULL THEN
        SELECT t.transaction_date
        INTO v_date
        FROM public.transactions t
        WHERE t.id = NEW.transaction_id;
      END IF;
  END;

  -- Run both snapshot generators
  IF v_date IS NOT NULL THEN
    PERFORM public.generate_performance_snapshots(v_date, CURRENT_DATE);
    PERFORM public.generate_monthly_snapshots();
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE TRIGGER "snapshot_after_new_crypto_prices" AFTER INSERT OR UPDATE ON "public"."daily_crypto_prices" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



CREATE OR REPLACE TRIGGER "snapshot_after_new_fx_rate" AFTER INSERT OR UPDATE ON "public"."daily_exchange_rates" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



CREATE OR REPLACE TRIGGER "snapshot_after_new_stock_price" AFTER INSERT OR UPDATE ON "public"."daily_stock_prices" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



CREATE OR REPLACE TRIGGER "snapshot_after_new_txn" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();

drop function if exists public.refresh_performance_snapshots();