CREATE OR REPLACE FUNCTION public.get_equity_chart(
  p_start_date date,
  p_end_date date,
  p_threshold integer
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  final_result jsonb;
BEGIN
  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.snapshot_date,
    dps.net_equity::numeric AS net_equity,
    dps.cumulative_cashflow::numeric AS cumulative_cashflow,
    ROW_NUMBER() OVER (ORDER BY dps.snapshot_date) AS rn
  FROM public.daily_snapshots dps
  WHERE dps.snapshot_date BETWEEN p_start_date AND p_end_date
  ORDER BY dps.snapshot_date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If below threshold → return all as JSON
  IF data_count <= p_threshold THEN
    SELECT jsonb_agg(
             jsonb_build_object(
               'snapshot_date', snapshot_date,
               'net_equity', net_equity,
               'cumulative_cashflow', cumulative_cashflow
             )
             ORDER BY snapshot_date
           )
    INTO final_result
    FROM raw_data;

    DROP TABLE raw_data;
    RETURN final_result;
  END IF;

  CREATE TEMP TABLE result_data_temp (
    snapshot_date DATE,
    net_equity NUMERIC,
    cumulative_cashflow NUMERIC
  );

  -- First point
  INSERT INTO result_data_temp
  SELECT snapshot_date, net_equity, cumulative_cashflow
  FROM raw_data
  WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    SELECT
      AVG(EXTRACT(EPOCH FROM snapshot_date)),
      AVG(net_equity)
    INTO avg_x, avg_y
    FROM raw_data
    WHERE rn BETWEEN range_start AND range_end;

    max_area := -1;

    SELECT * INTO result_data
    FROM result_data_temp
    ORDER BY snapshot_date DESC
    LIMIT 1;

    FOR data IN
      SELECT * FROM raw_data WHERE rn BETWEEN range_start AND range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - avg_x)
        * (data.net_equity - result_data.net_equity)
        -
        (EXTRACT(EPOCH FROM result_data.snapshot_date)
        - EXTRACT(EPOCH FROM data.snapshot_date))
        * (avg_y - result_data.net_equity)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp
    VALUES (
      point_to_add.snapshot_date,
      point_to_add.net_equity,
      point_to_add.cumulative_cashflow
    );

    a := a + 1;
  END LOOP;

  -- Last point
  INSERT INTO result_data_temp
  SELECT snapshot_date, net_equity, cumulative_cashflow
  FROM raw_data
  WHERE rn = data_count;

  -- Build final JSON
  SELECT jsonb_agg(
           jsonb_build_object(
             'snapshot_date', snapshot_date,
             'net_equity', net_equity,
             'cumulative_cashflow', cumulative_cashflow
           )
           ORDER BY snapshot_date
         )
  INTO final_result
  FROM result_data_temp;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;

  RETURN final_result;
END;
$$;