SET check_function_bodies = false;
DROP FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric);
DROP FUNCTION public.new_calculate_twr(p_start_date date, p_end_date date);
DROP FUNCTION public.new_get_return_chart(p_start_date date, p_end_date date, p_threshold integer);
ALTER TABLE public.dnse_order_events DROP COLUMN created_date;
ALTER TABLE public.dnse_order_events DROP COLUMN market_type;
ALTER TABLE public.dnse_order_events DROP COLUMN trans_date;
DROP TABLE public.refresh_queue;
DROP TRIGGER after_dnse_order_insert ON public.dnse_orders;
DROP TRIGGER refresh_after_fx_rate ON public.historical_fxrate;
DROP TRIGGER refresh_after_prices ON public.historical_prices;
DROP TRIGGER trg_upsert_historical_prices ON public.m1_intraday_close;
DROP TRIGGER tx_legs_after_tx_borrow ON public.tx_borrow;
DROP TRIGGER tx_legs_after_tx_cashflow ON public.tx_cashflow;
DROP TRIGGER refresh_after_tx_legs ON public.tx_legs;
DROP FUNCTION public.enqueue_refresh_data();
DROP TRIGGER tx_legs_after_tx_repay ON public.tx_repay;
DROP TRIGGER tx_legs_after_tx_stock ON public.tx_stock;
CREATE FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric DEFAULT 0, p_user_id uuid DEFAULT auth.uid())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id uuid;
  v_stock_id uuid;
BEGIN
  -- Find stock id
  SELECT a.id
    INTO v_stock_id
  FROM public.assets a
  WHERE a.ticker = p_ticker;

  -- Insert into tx_entries
  INSERT INTO public.tx_entries (category, memo, user_id)
  VALUES (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text,
    p_user_id
  )
  RETURNING id INTO v_tx_id;

  -- Insert into tx_stock
  INSERT INTO public.tx_stock (
    tx_id,
    operation,
    stock_id,
    price,
    quantity,
    fee,
    tax
  )
  VALUES (
    v_tx_id,
    p_side,
    v_stock_id,
    p_price,
    p_quantity,
    p_fee,
    COALESCE(p_tax, 0)
  );
END;
$function$;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid) TO anon;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.process_dnse_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN
  DECLARE
    v_user_id uuid;
    v_tax numeric;
    v_fee numeric;

  BEGIN
    -- Map broker account → internal user_id
    SELECT us.user_id
      INTO v_user_id
    FROM public.user_settings us
    WHERE us.dnse_account_id = NEW.account_no;

    -- Safety guard (important)
    IF v_user_id IS NULL THEN
      RAISE WARNING 'No user mapping found for account_no=%', NEW.account_no;
      RETURN NULL;
    END IF;

    -- Only process relevant statuses
    IF NEW.order_status IN ('Filled', 'DoneForDay', 'Canceled')
      AND COALESCE(NEW.fill_quantity, 0) > 0 THEN

      v_tax := 0;
      v_fee := 0;

      IF NEW.side = 'sell' THEN
        v_tax := 0.001 * NEW.average_price * NEW.fill_quantity;
        v_fee := 0.3 * NEW.fill_quantity;
      END IF;

      PERFORM public.add_stock_event(
        NEW.side,
        NEW.symbol,
        NEW.average_price,
        NEW.fill_quantity,
        v_fee,
        v_tax,
        v_user_id
      );

    END IF;

    RETURN NULL;
  END;
END;$function$;
CREATE FUNCTION public.refresh_daily_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
  refresh materialized view public.daily_snapshots;
end;$function$;
GRANT ALL ON FUNCTION public.refresh_daily_snapshots() TO anon;
GRANT ALL ON FUNCTION public.refresh_daily_snapshots() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_daily_snapshots() TO service_role;
ALTER TABLE public.dnse_order_events ADD COLUMN avg_price numeric;
CREATE TRIGGER after_filled_dnse_orders AFTER INSERT ON public.dnse_order_events FOR EACH ROW EXECUTE FUNCTION public.process_dnse_order();
CREATE TRIGGER after_new_fxrate AFTER INSERT OR UPDATE ON public.historical_fxrate FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_snapshots();
CREATE TRIGGER after_new_prices AFTER INSERT OR UPDATE ON public.historical_prices FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_snapshots();
CREATE TRIGGER after_new_m1_close AFTER INSERT ON public.m1_intraday_close FOR EACH ROW EXECUTE FUNCTION public.upsert_historical_prices();
CREATE TRIGGER after_new_tx_borrow AFTER INSERT ON public.tx_borrow FOR EACH ROW EXECUTE FUNCTION public.trg_process_tx_borrow();
CREATE TRIGGER after_new_tx_cashflow AFTER INSERT ON public.tx_cashflow FOR EACH ROW EXECUTE FUNCTION public.trg_process_tx_cashflow();
CREATE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
CREATE TRIGGER after_new_tx_repay AFTER INSERT ON public.tx_repay FOR EACH ROW EXECUTE FUNCTION public.trg_process_tx_repay();
CREATE TRIGGER after_new_tx_stock AFTER INSERT ON public.tx_stock FOR EACH ROW EXECUTE FUNCTION public.trg_process_tx_stock();
CREATE TABLE public.user_settings (user_id uuid NOT NULL, dnse_account_id text);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
GRANT ALL ON public.user_settings TO anon;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
