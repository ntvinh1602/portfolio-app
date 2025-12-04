drop function if exists "public"."sampling_equity_data"("date", "date", integer);

CREATE OR REPLACE FUNCTION public.sampling_equity_data(
  p_start_date date,
  p_end_date date,
  p_threshold integer
)
RETURNS TABLE(
  date date,
  net_equity_value numeric,
  total_cashflow numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  data_count INT;
  data RECORD;
  result_data RECORD;
  avg_x NUMERIC;
  avg_y NUMERIC;
  range_start INT;
  range_end INT;
  point_area NUMERIC;
  max_area NUMERIC;
  point_to_add RECORD;
  every NUMERIC;
  i INT;
  a INT := 0;
BEGIN
  -- Create temp table with both equity and total_cashflow
  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.date,
    dps.net_equity_value::numeric AS net_equity_value,
    dps.total_cashflow::numeric AS total_cashflow,
    ROW_NUMBER() OVER (ORDER BY dps.date) AS rn
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date AND dps.date <= p_end_date
  ORDER BY dps.date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If data below threshold, return all
  IF data_count <= p_threshold THEN
    RETURN QUERY
    SELECT rd.date, rd.net_equity_value, rd.total_cashflow
    FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- Temporary result table
  CREATE TEMP TABLE result_data_temp (
    date DATE,
    net_equity_value NUMERIC,
    total_cashflow NUMERIC
  );

  -- Always add first point
  INSERT INTO result_data_temp
  SELECT rd.date, rd.net_equity_value, rd.total_cashflow
  FROM raw_data rd
  WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    -- Compute average for the next bucket
    SELECT
      AVG(EXTRACT(EPOCH FROM rd.date)),
      AVG(rd.net_equity_value)
    INTO avg_x, avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    max_area := -1;
    SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;

    FOR data IN
      SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.net_equity_value - result_data.net_equity_value) -
        (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.net_equity_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp (date, net_equity_value, total_cashflow)
    VALUES (point_to_add.date, point_to_add.net_equity_value, point_to_add.total_cashflow);

    a := a + 1;
  END LOOP;

  -- Always add last point
  INSERT INTO result_data_temp
  SELECT rd.date, rd.net_equity_value, rd.total_cashflow
  FROM raw_data rd
  WHERE rn = data_count;

  -- Return the final sampled points
  RETURN QUERY
  SELECT * FROM result_data_temp ORDER BY date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;

drop function if exists public.get_equity_chart_data(integer);

CREATE OR REPLACE FUNCTION public.get_equity_chart_data(
  p_threshold integer
)
RETURNS TABLE(
  range_label text,
  snapshot_date date,
  net_equity_value numeric,
  total_cashflow numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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

    -- Call sampling_equity_data() and include total_cashflow
    RETURN QUERY
    SELECT
      label AS range_label,
      s.date AS snapshot_date,
      s.net_equity_value,
      s.total_cashflow
    FROM public.sampling_equity_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;

