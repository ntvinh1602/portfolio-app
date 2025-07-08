CREATE OR REPLACE FUNCTION public.get_latest_exchange_rate(p_currency_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  latest_rate NUMERIC;
BEGIN
  SELECT rate
  INTO latest_rate
  FROM public.daily_exchange_rates
  WHERE currency_code = p_currency_code
  ORDER BY date DESC
  LIMIT 1;

  RETURN latest_rate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_exchange_rate(TEXT) TO authenticated;