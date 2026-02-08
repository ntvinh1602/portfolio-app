CREATE OR REPLACE FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_first_portfolio_value numeric;
  v_first_vni_value numeric;
  data_count INT;
  -- LTTB implementation variables
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
  -- Step 1: Find the first available values on or after the start date for normalization
  SELECT dps.equity_index INTO v_first_portfolio_value
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date
  ORDER BY dps.date
  LIMIT 1;

  SELECT md.close INTO v_first_vni_value
  FROM public.daily_market_indices md
  WHERE md.symbol = 'VNINDEX' AND md.date >= p_start_date
  ORDER BY md.date
  LIMIT 1;

  -- Create a temporary table to hold the raw, joined, and normalized data
  CREATE TEMP TABLE raw_data AS
  WITH portfolio_data AS (
    SELECT
      dps.date,
      dps.equity_index
    FROM public.daily_performance_snapshots dps
    WHERE dps.date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT
      md.date,
      md.close
    FROM public.daily_market_indices md
    WHERE md.symbol = 'VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    pd.date,
    (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 as portfolio_value,
    (vni.close / NULLIF(v_first_vni_value, 0)) * 100 as vni_value,
    ROW_NUMBER() OVER (ORDER BY pd.date) as rn
  FROM portfolio_data pd
  INNER JOIN vni_data vni ON pd.date = vni.date
  ORDER BY pd.date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If the data count is below the threshold, return all points
  IF data_count <= p_threshold THEN
    RETURN QUERY SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- LTTB Downsampling
  CREATE TEMP TABLE result_data_temp (
    date DATE,
    portfolio_value NUMERIC,
    vni_value NUMERIC
  );

  -- Always add the first point
  INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    -- Calculate average for the next bucket
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    IF range_end > data_count THEN range_end := data_count;
    END IF;
    
    IF range_start > range_end THEN CONTINUE;
    END IF;

    SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    SELECT AVG(rd.portfolio_value) INTO avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    -- Find the point with the largest triangle area based on portfolio_value
    max_area := -1;

    SELECT * INTO result_data
    FROM result_data_temp
    ORDER BY date
    DESC LIMIT 1;

    FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.portfolio_value - result_data.portfolio_value) -
        (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    -- Add the selected point to the results
    INSERT INTO result_data_temp (date, portfolio_value, vni_value)
    VALUES (point_to_add.date, point_to_add.portfolio_value, point_to_add.vni_value);
    a := a + 1;
  END LOOP;

  -- Always add the last point
  INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = data_count;

  RETURN QUERY SELECT r.date, r.portfolio_value, r.vni_value FROM result_data_temp r ORDER BY r.date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;