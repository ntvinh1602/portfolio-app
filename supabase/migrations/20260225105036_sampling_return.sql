CREATE OR REPLACE FUNCTION public.get_return_chart(
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
  v_first_portfolio_value numeric;
  v_first_vni_value numeric;
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
  -- Get normalization base values
  SELECT dps.equity_index
  INTO v_first_portfolio_value
  FROM public.daily_snapshots dps
  WHERE dps.snapshot_date >= p_start_date
  ORDER BY dps.snapshot_date
  LIMIT 1;

  SELECT md.close
  INTO v_first_vni_value
  FROM public.daily_market_indices md
  WHERE md.symbol = 'VNINDEX'
    AND md.date >= p_start_date
  ORDER BY md.date
  LIMIT 1;

  -- Build raw joined dataset
  CREATE TEMP TABLE raw_data AS
  WITH portfolio_data AS (
    SELECT snapshot_date, equity_index
    FROM public.daily_snapshots
    WHERE snapshot_date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT date, close
    FROM public.daily_market_indices
    WHERE symbol = 'VNINDEX'
      AND date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    pd.snapshot_date,
    (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
    (vni.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value,
    ROW_NUMBER() OVER (ORDER BY pd.snapshot_date) AS rn
  FROM portfolio_data pd
  INNER JOIN vni_data vni ON pd.snapshot_date = vni.date
  ORDER BY pd.snapshot_date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If below threshold → return full JSON
  IF data_count <= p_threshold THEN
    SELECT jsonb_agg(
             jsonb_build_object(
               'snapshot_date', snapshot_date,
               'portfolio_value', portfolio_value,
               'vni_value', vni_value
             )
             ORDER BY snapshot_date
           )
    INTO final_result
    FROM raw_data;

    DROP TABLE raw_data;
    RETURN final_result;
  END IF;

  -- LTTB sampling
  CREATE TEMP TABLE result_data_temp (
    snapshot_date DATE,
    portfolio_value NUMERIC,
    vni_value NUMERIC
  );

  -- First point
  INSERT INTO result_data_temp
  SELECT snapshot_date, portfolio_value, vni_value
  FROM raw_data
  WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    IF range_end > data_count THEN
      range_end := data_count;
    END IF;

    IF range_start > range_end THEN
      CONTINUE;
    END IF;

    SELECT AVG(EXTRACT(EPOCH FROM snapshot_date))
    INTO avg_x
    FROM raw_data
    WHERE rn BETWEEN range_start AND range_end;

    SELECT AVG(portfolio_value)
    INTO avg_y
    FROM raw_data
    WHERE rn BETWEEN range_start AND range_end;

    max_area := -1;

    SELECT *
    INTO result_data
    FROM result_data_temp
    ORDER BY snapshot_date DESC
    LIMIT 1;

    FOR data IN
      SELECT *
      FROM raw_data
      WHERE rn BETWEEN range_start AND range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - avg_x)
        * (data.portfolio_value - result_data.portfolio_value)
        -
        (EXTRACT(EPOCH FROM result_data.snapshot_date)
         - EXTRACT(EPOCH FROM data.snapshot_date))
        * (avg_y - result_data.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp
    VALUES (
      point_to_add.snapshot_date,
      point_to_add.portfolio_value,
      point_to_add.vni_value
    );

    a := a + 1;
  END LOOP;

  -- Last point
  INSERT INTO result_data_temp
  SELECT snapshot_date, portfolio_value, vni_value
  FROM raw_data
  WHERE rn = data_count;

  -- Aggregate final JSON result
  SELECT jsonb_agg(
           jsonb_build_object(
             'snapshot_date', snapshot_date,
             'portfolio_value', portfolio_value,
             'vni_value', vni_value
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