CREATE OR REPLACE FUNCTION public.generate_monthly_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := DATE '2021-11-01';
  v_end_date DATE := CURRENT_DATE;
BEGIN
  -- Insert or update monthly snapshots
  INSERT INTO public.monthly_snapshots (date, pnl, interest, tax, fee)
  WITH expenses AS (
    SELECT 
      month, 
      trading_fees, 
      taxes, 
      interest
    FROM public.get_monthly_expenses(v_start_date, v_end_date)
  ),
  pnl AS (
    SELECT 
      month, 
      pnl
    FROM public.get_monthly_pnl(v_start_date, v_end_date)
  )
  SELECT 
    TO_DATE(COALESCE(e.month, p.month), 'YYYY-MM') AS date,
    p.pnl,
    e.interest,
    e.taxes,
    e.trading_fees
  FROM expenses e
  FULL JOIN pnl p ON e.month = p.month
  ORDER BY date
  ON CONFLICT (date) DO UPDATE
  SET pnl = EXCLUDED.pnl,
      interest = EXCLUDED.interest,
      tax = EXCLUDED.tax,
      fee = EXCLUDED.fee;
END;
$$;
