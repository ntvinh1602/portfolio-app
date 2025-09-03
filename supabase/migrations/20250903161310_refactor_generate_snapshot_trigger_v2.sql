CREATE OR REPLACE FUNCTION "public"."update_assets_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update all assets linked to the inserted transaction
  UPDATE public.assets a
  SET current_quantity = CASE
    WHEN a.ticker = 'INTERESTS' THEN COALESCE((
      SELECT SUM(
        d.principal_amount *
        (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)
      )
      FROM public.debts d
      WHERE d.is_active
    ), 0)
    ELSE COALESCE((
      SELECT SUM(quantity)
      FROM public.transaction_legs tl
      WHERE tl.asset_id = a.id
    ), 0)
  END
  WHERE a.id = NEW.asset_id;
  RETURN NULL;
END;
$$;