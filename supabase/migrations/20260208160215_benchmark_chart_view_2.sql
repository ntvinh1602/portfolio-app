CREATE MATERIALIZED VIEW public.benchmark_chart_data AS

-- === All-time range ===
SELECT
  'all_time' AS timeframe,
  d.date,
  d.portfolio_value,
  d.vni_value
FROM sampling_benchmark_data(
  (SELECT MIN(date) FROM public.daily_performance_snapshots),
  (SELECT MAX(date) FROM public.daily_performance_snapshots),
  150
) AS d

UNION ALL

-- === Last 1 year ===
SELECT
  '1y' AS timeframe,
  d.date,
  d.portfolio_value,
  d.vni_value
FROM sampling_benchmark_data(
  ((SELECT MAX(date) FROM public.daily_performance_snapshots) - INTERVAL '1 year')::date,
  (SELECT MAX(date) FROM public.daily_performance_snapshots),
  150
) AS d

UNION ALL

-- === Last 6 months ===
SELECT
  '6m' AS timeframe,
  d.date,
  d.portfolio_value,
  d.vni_value
FROM sampling_benchmark_data(
  ((SELECT MAX(date) FROM public.daily_performance_snapshots) - INTERVAL '6 month')::date,
  (SELECT MAX(date) FROM public.daily_performance_snapshots),
  150
) AS d

UNION ALL

-- === Last 3 months ===
SELECT
  '3m' AS timeframe,
  d.date,
  d.portfolio_value,
  d.vni_value
FROM sampling_benchmark_data(
  ((SELECT MAX(date) FROM public.daily_performance_snapshots) - INTERVAL '3 month')::date,
  (SELECT MAX(date) FROM public.daily_performance_snapshots),
  150
) AS d

UNION ALL

-- === Yearly breakdown since 2022 ===
SELECT
  year::text AS timeframe,
  d.date,
  d.portfolio_value,
  d.vni_value
FROM (
  SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year
  FROM public.daily_performance_snapshots
  WHERE date >= '2022-01-01'
  ORDER BY year
) years
CROSS JOIN LATERAL sampling_benchmark_data(
  to_date(year::text, 'YYYY')::date,
  (to_date((year + 1)::text, 'YYYY') - INTERVAL '1 day')::date,
  150
) AS d;
