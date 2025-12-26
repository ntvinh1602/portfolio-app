CREATE OR REPLACE FUNCTION "public"."get_annual_cashflow"()
RETURNS TABLE (
  year int,
  deposits numeric,
  withdrawals numeric
)
LANGUAGE sql SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT
    EXTRACT(YEAR FROM date)::int AS year,
    SUM(CASE WHEN net_cash_flow > 0 THEN net_cash_flow ELSE 0 END) AS deposits,
    SUM(CASE WHEN net_cash_flow < 0 THEN net_cash_flow ELSE 0 END) AS withdrawals
  FROM public.daily_performance_snapshots
  GROUP BY year
  ORDER BY year;
$$;
