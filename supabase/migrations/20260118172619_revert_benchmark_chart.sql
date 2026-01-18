CREATE OR REPLACE FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT
      label,
      s.date::date AS snapshot_date,
      s.portfolio_value,
      s.vni_value
    FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;