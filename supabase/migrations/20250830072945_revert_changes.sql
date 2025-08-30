CREATE OR REPLACE FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
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
  -- Create a temporary table to hold the raw data, casting the value to numeric
  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.date,
    dps.net_equity_value::numeric as net_equity_value,
    ROW_NUMBER() OVER (ORDER BY dps.date) as rn
  FROM daily_performance_snapshots dps
  WHERE dps.user_id = p_user_id
    AND dps.date >= p_start_date
    AND dps.date <= p_end_date
  ORDER BY dps.date;
  SELECT COUNT(*) INTO data_count FROM raw_data;
  -- If the data count is below the threshold, return all points
  IF data_count <= p_threshold THEN
    RETURN QUERY SELECT rd.date, rd.net_equity_value FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;
  -- LTTB Downsampling
  CREATE TEMP TABLE result_data_temp (
    date DATE,
    net_equity_value NUMERIC
  );
  -- Always add the first point
  INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = 1;
  every := (data_count - 2.0) / (p_threshold - 2.0);
  FOR i IN 0..p_threshold - 3 LOOP
    -- Calculate average for the next bucket
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;
    SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
    SELECT AVG(rd.net_equity_value) INTO avg_y FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
    -- Find the point with the largest triangle area
    max_area := -1;
    -- Get the last point added to the results
    SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;
    FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.net_equity_value - result_data.net_equity_value) -
        (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.net_equity_value)
      ) * 0.5;
      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;
    -- Add the selected point to the results
    INSERT INTO result_data_temp (date, net_equity_value)
    VALUES (point_to_add.date, point_to_add.net_equity_value);
    a := a + 1;
  END LOOP;
  -- Always add the last point
  INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = data_count;
  RETURN QUERY SELECT * FROM result_data_temp ORDER BY date;
  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;