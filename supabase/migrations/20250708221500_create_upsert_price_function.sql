CREATE OR REPLACE FUNCTION public.upsert_daily_stock_price(
  p_ticker TEXT,
  p_price NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Find the security_id for the given ticker
  SELECT id INTO v_security_id
  FROM public.securities
  WHERE ticker = p_ticker;

  IF v_security_id IS NULL THEN
    RAISE EXCEPTION 'Security with ticker % not found', p_ticker;
  END IF;

  -- Upsert the price into the daily_stock_prices table
  INSERT INTO public.daily_stock_prices (security_id, date, price)
  VALUES (v_security_id, CURRENT_DATE, p_price)
  ON CONFLICT (security_id, date) DO UPDATE
  SET price = EXCLUDED.price;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_daily_stock_price(TEXT, NUMERIC) TO authenticated;