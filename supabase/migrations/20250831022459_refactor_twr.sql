CREATE OR REPLACE FUNCTION "public"."get_twr"("p_user_id" "uuid")
RETURNS TABLE(
  range_label text,
  twr numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', 'ytd'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- Determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots
        WHERE user_id = p_user_id;
      WHEN 'ytd' THEN start_date := date_trunc('year', end_date);
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT label, public.calculate_twr(p_user_id, start_date, end_date);
  END LOOP;
END;
$$;