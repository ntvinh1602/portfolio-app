CREATE OR REPLACE FUNCTION public.sampling_benchmark_data(
  p_start_date date,
  p_end_date date,
  p_threshold integer
)
RETURNS TABLE(date date, portfolio_value numeric, vni_value numeric)
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
  data record;
  last_point record;
  prev_point record;
  point_to_add record;
BEGIN
  SELECT equity_index INTO v_first_portfolio_value
  FROM public.daily_performance_snapshots
  WHERE date >= p_start_date
  ORDER BY date
  LIMIT 1;

  SELECT close INTO v_first_vni_value
  FROM public.daily_market_indices
  WHERE symbol = 'VNINDEX' AND date >= p_start_date
  ORDER BY date
  LIMIT 1;

  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.date,
    (dps.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
    (md.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value,
    ROW_NUMBER() OVER (ORDER BY dps.date) AS rn
  FROM public.daily_performance_snapshots dps
  JOIN public.daily_market_indices md
    ON dps.date = md.date
  WHERE dps.date BETWEEN p_start_date AND p_end_date
  ORDER BY dps.date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- Always return full data if it's small or short range
  IF data_count <= p_threshold OR p_end_date - p_start_date < 30 THEN
    RETURN QUERY SELECT date, portfolio_value, vni_value FROM raw_data ORDER BY date;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  CREATE TEMP TABLE result_data_temp (
    date date,
    portfolio_value numeric,
    vni_value numeric
  );

  -- add first point
  INSERT INTO result_data_temp
  SELECT date, portfolio_value, vni_value FROM raw_data WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);
  SELECT * INTO prev_point FROM raw_data WHERE rn = 1;

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor((i    ) * every) + 2;
    range_end   := floor((i + 1) * every) + 1;

    IF range_end > data_count THEN range_end := data_count; END IF;

    SELECT AVG(EXTRACT(EPOCH FROM date)), AVG(portfolio_value)
    INTO avg_x, avg_y
    FROM raw_data WHERE rn BETWEEN range_start AND range_end;

    max_area := -1;
    FOR data IN SELECT * FROM raw_data WHERE rn BETWEEN range_start AND range_end LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev_point.date) - avg_x) *
        (data.portfolio_value - prev_point.portfolio_value) -
        (EXTRACT(EPOCH FROM prev_point.date) - EXTRACT(EPOCH FROM data.date)) *
        (avg_y - prev_point.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp VALUES (point_to_add.date, point_to_add.portfolio_value, point_to_add.vni_value);
    prev_point := point_to_add;
  END LOOP;

  -- add last point
  SELECT * INTO last_point FROM raw_data WHERE rn = data_count;
  INSERT INTO result_data_temp VALUES (last_point.date, last_point.portfolio_value, last_point.vni_value);

  RETURN QUERY SELECT date, portfolio_value, vni_value FROM result_data_temp ORDER BY date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;
