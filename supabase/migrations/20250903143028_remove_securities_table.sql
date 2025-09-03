CREATE OR REPLACE FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  -- Get the asset_id from the assets table for stock assets
  SELECT id INTO v_asset_id
  FROM public.assets
  WHERE ticker = p_ticker AND asset_class = 'stock';
  -- If the security exists, insert or update the price
  IF v_asset_id IS NOT NULL THEN
    INSERT INTO daily_stock_prices (asset_id, price, date)
    VALUES (v_asset_id, p_price, CURRENT_DATE)
    ON CONFLICT (asset_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.securities;

alter table public.assets
drop column security_id;
