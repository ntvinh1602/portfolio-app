SET check_function_bodies = false;
CREATE OR REPLACE FUNCTION public.process_dnse_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$BEGIN
  DECLARE
    v_user_id uuid;

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
    IF NEW.order_status = 'Filled'
      AND COALESCE(NEW.fill_quantity, 0) > 0 THEN
      PERFORM public.add_stock_event(
        NEW.side,
        NEW.symbol,
        NEW.average_price,
        NEW.fill_quantity,
        NEW.fee,
        NEW.tax,
        v_user_id
      );
    END IF;
    RETURN NULL;
  END;
END;$function$;
ALTER TABLE public.dnse_order_events ADD COLUMN tax numeric;
ALTER TABLE public.dnse_order_events ADD COLUMN fee numeric;
