-- Drop old monthly calculation functions
DROP FUNCTION IF EXISTS public.get_monthly_expenses(date, date);
DROP FUNCTION IF EXISTS public.get_monthly_pnl(date, date);

CREATE OR REPLACE FUNCTION public.generate_monthly_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := DATE '2021-11-01';
  v_end_date DATE := CURRENT_DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_pnl NUMERIC;
BEGIN
  FOR v_month_start IN
    SELECT date_trunc('month', dd)::DATE
    FROM generate_series(v_start_date, v_end_date, '1 month'::interval) dd
  LOOP
    -- last day of the month (or today if current month)
    IF date_trunc('month', v_month_start) = date_trunc('month', v_end_date) THEN
      v_month_end := v_end_date;
    ELSE
      v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
    END IF;

    -- Calculate PnL
    SELECT public.calculate_pnl(v_month_start, v_month_end) INTO v_pnl;

    -- Calculate expenses directly
    INSERT INTO public.monthly_snapshots (date, pnl, interest, tax, fee)
    WITH
    -- 1. Trading fees + taxes
    trading_costs AS (
      SELECT
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%fee%'), 0) AS total_fees,
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%tax%'), 0) AS total_taxes
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'expense'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    ),
    -- 2. Loan interest
    loan_interest_costs AS (
      SELECT
        COALESCE(SUM(tl.amount), 0) AS total_interest
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'debt_payment'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    ),
    -- 3. Margin + cash advance interest
    other_interest_costs AS (
      SELECT
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Margin%'), 0) AS margin_interest,
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Cash advance%'), 0) AS cash_advance_interest
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'expense'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    )
    SELECT
      v_month_start,
      v_pnl,
      (lic.total_interest + oic.margin_interest + oic.cash_advance_interest) AS interest,
      tc.total_taxes,
      tc.total_fees
    FROM trading_costs tc, loan_interest_costs lic, other_interest_costs oic
    ON CONFLICT (date) DO UPDATE
      SET pnl = EXCLUDED.pnl,
          interest = EXCLUDED.interest,
          tax = EXCLUDED.tax,
          fee = EXCLUDED.fee;
  END LOOP;
END;
$$;
