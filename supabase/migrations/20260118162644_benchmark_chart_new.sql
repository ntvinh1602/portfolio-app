CREATE OR REPLACE FUNCTION public.get_benchmark_chart_data(p_threshold integer)
RETURNS TABLE(
  range_label text,
  snapshot_date date,
  portfolio_value numeric,
  vni_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fixed_ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  label text;
  start_date date;
  end_date date := CURRENT_DATE;
  first_year CONSTANT int := 2022;
  current_year int := EXTRACT(YEAR FROM CURRENT_DATE);
  y int;
BEGIN
  -- 1️⃣ Loop over fixed ranges
  FOREACH label IN ARRAY fixed_ranges LOOP
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date FROM public.daily_performance_snapshots;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    RETURN QUERY
    SELECT
      label AS range_label,
      s.date::date AS snapshot_date,
      s.portfolio_value,
      s.vni_value
    FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
  END LOOP;

  -- 2️⃣ Loop over yearly ranges from 2022 to current year
  FOR y IN first_year..current_year LOOP
    start_date := make_date(y, 1, 1);
    end_date := make_date(y, 12, 31);
    IF end_date > CURRENT_DATE THEN
      end_date := CURRENT_DATE; -- truncate current year to today
    END IF;

    RETURN QUERY
    SELECT
      y::text AS range_label,
      s.date::date AS snapshot_date,
      s.portfolio_value,
      s.vni_value
    FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
  END LOOP;

END;
$$;
