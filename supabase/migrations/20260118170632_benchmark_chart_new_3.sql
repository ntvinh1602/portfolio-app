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
  rolling_ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  label text;
  start_date date;
  end_date date := CURRENT_DATE;
  first_year CONSTANT int := 2022;
  last_data_year int;
  y int;
BEGIN
  -- Find last year that has data
  SELECT EXTRACT(YEAR FROM MAX(date))::int INTO last_data_year
  FROM public.daily_performance_snapshots;

  -- 1️⃣ Handle rolling ranges
  FOREACH label IN ARRAY rolling_ranges LOOP
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
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

  -- 2️⃣ Handle calendar-year ranges (2022 → last year with data)
  FOR y IN first_year..last_data_year LOOP
    start_date := make_date(y, 1, 1);
    end_date := make_date(y, 12, 31);

    -- Truncate current year to today if necessary
    IF end_date > CURRENT_DATE THEN
      end_date := CURRENT_DATE;
    END IF;

    -- Only fetch if this year has data
    IF EXISTS (
      SELECT 1
      FROM public.daily_performance_snapshots
      WHERE date BETWEEN start_date AND end_date
    ) THEN
      RETURN QUERY
      SELECT
        y::text AS range_label,
        s.date::date AS snapshot_date,
        s.portfolio_value,
        s.vni_value
      FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
    END IF;
  END LOOP;

END;
$$;
