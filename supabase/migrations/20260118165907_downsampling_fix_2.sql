CREATE OR REPLACE FUNCTION public.sampling_benchmark_data(
  p_start_date date,
  p_end_date date,
  p_threshold integer
)
RETURNS TABLE(
  date date,
  portfolio_value numeric,
  vni_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first_portfolio_value numeric;
  v_first_vni_value numeric;
  data_count int;
  every numeric;
  range_start int;
  range_end int;
  avg_x numeric;
  avg_y numeric;
  max_area numeric;
  point_area numeric;
  i int;
  data_row record;
  last_point record;
  prev_point record;
  point_to_add record;
BEGIN
  -- 1️⃣ Get first available values for normalization
  SELECT dps.equity_index
  INTO v_first_portfolio_value
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date
  ORDER BY dps.date
  LIMIT 1;

  SELECT md.close
  INTO v_first_vni_value
  FROM public.daily_market_indices md
  WHERE md.symbol = 'VNINDEX' AND md.date >= p_start_date
  ORDER BY md.date
  LIMIT 1;

  -- 2️⃣ Build raw data table
  CREATE TEMP TABLE raw_data AS
  WITH portfolio_data AS (
    SELECT dps.date AS snapshot_date, dps.equity_index
    FROM public.daily_performance_snapshots dps
    WHERE dps.date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT md.date AS snapshot_date, md.close
    FROM public.daily_market_indices md
    WHERE md.symbol = 'VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    pd.snapshot_date AS date,
    (pd.equity_index / NULLIF(v_first_portfolio_value,0)) * 100 AS portfolio_value,
    (COALESCE(vni.close, v_first_vni_value) / NULLIF(v_first_vni_value,0)) * 100 AS vni_value,
    ROW_NUMBER() OVER (ORDER BY pd.snapshot_date) AS rn
  FROM portfolio_data pd
  JOIN vni_data vni ON pd.snapshot_date = vni.snapshot_date
  ORDER BY pd.snapshot_date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- 3️⃣ If data is too short, return all rows directly
  IF data_count <= p_threshold OR (p_end_date - p_start_date < 30) THEN
    RETURN QUERY
    SELECT r.date, r.portfolio_value, r.vni_value
    FROM raw_data r
    ORDER BY r.date;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- 4️⃣ Downsampling via LTTB
  CREATE TEMP TABLE result_data_temp (
    date date,
    portfolio_value numeric,
    vni_value numeric
  );

  -- Always add first point
  INSERT INTO result_data_temp
  SELECT r.date, r.portfolio_value, r.vni_value
  FROM raw_data r
  WHERE r.rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);
  SELECT * INTO prev_point FROM raw_data WHERE rn = 1;

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(i * every) + 2;
    range_end := floor((i + 1) * every) + 1;

    IF range_end > data_count THEN
      range_end := data_count;
    END IF;

    -- Skip empty range
    IF range_start > range_end THEN
      CONTINUE;
    END IF;

    -- Compute averages for LTTB
    SELECT AVG(EXTRACT(EPOCH FROM r.date)), AVG(r.portfolio_value)
    INTO avg_x, avg_y
    FROM raw_data r
    WHERE r.rn BETWEEN range_start AND range_end;

    max_area := -1;

    FOR data_row IN
      SELECT * FROM raw_data r WHERE r.rn BETWEEN range_start AND range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev_point.date) - avg_x) *
        (data_row.portfolio_value - prev_point.portfolio_value) -
        (EXTRACT(EPOCH FROM prev_point.date) - EXTRACT(EPOCH FROM data_row.date)) *
        (avg_y - prev_point.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data_row;
      END IF;
    END LOOP;

    -- Add selected point to results
    INSERT INTO result_data_temp VALUES (
      point_to_add.date,
      point_to_add.portfolio_value,
      point_to_add.vni_value
    );
    prev_point := point_to_add;
  END LOOP;

  -- Always add last point
  SELECT * INTO last_point FROM raw_data WHERE rn = data_count;
  INSERT INTO result_data_temp
  VALUES (last_point.date, last_point.portfolio_value, last_point.vni_value);

  -- 5️⃣ Return final downsampled table
  RETURN QUERY
  SELECT r.date, r.portfolio_value, r.vni_value
  FROM result_data_temp r
  ORDER BY r.date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;
