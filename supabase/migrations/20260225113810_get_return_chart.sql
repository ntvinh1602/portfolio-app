CREATE TYPE public.equity_point AS (
  snapshot_date date,
  net_equity numeric,
  cumulative_cashflow numeric
);

CREATE TYPE public.benchmark_point AS (
  snapshot_date date,
  portfolio_value numeric,
  vni_value numeric
);

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

  raw_data public.benchmark_point[];
  result_data public.benchmark_point[];

  data_count int;
  every numeric;

  i int;
  a int := 0;

  range_start int;
  range_end int;

  avg_x numeric;
  avg_y numeric;

  max_area numeric;
  point_area numeric;

  selected RECORD;
  prev RECORD;

  final_result jsonb;
BEGIN
  -- Get normalization anchors
  SELECT equity_index
  INTO v_first_portfolio_value
  FROM public.daily_snapshots
  WHERE snapshot_date >= p_start_date
  ORDER BY snapshot_date
  LIMIT 1;

  SELECT close
  INTO v_first_vni_value
  FROM public.daily_market_indices
  WHERE symbol = 'VNINDEX'
    AND date >= p_start_date
  ORDER BY date
  LIMIT 1;

  -- Load dataset into memory array
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
      (vni.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM public.daily_snapshots pd
    JOIN public.daily_market_indices vni
      ON pd.snapshot_date = vni.date
    WHERE pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND vni.symbol = 'VNINDEX'
  ) t;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- If below threshold → return full set
  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_agg(to_jsonb(x))
      FROM unnest(raw_data) x
    );
  END IF;

  -- LTTB sampling
  result_data := ARRAY[ raw_data[1] ];
  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP

    range_start := floor(a * every)::int + 2;
    range_end := floor((a + 1) * every)::int + 1;

    IF range_end > data_count THEN
      range_end := data_count;
    END IF;

    -- Compute next bucket average
    SELECT
      AVG(EXTRACT(EPOCH FROM r.snapshot_date)),
      AVG(r.portfolio_value)
    INTO avg_x, avg_y
    FROM unnest(raw_data[range_start:range_end]) r;

    max_area := -1;
    prev := result_data[array_length(result_data,1)];

    FOR selected IN
      SELECT * FROM unnest(raw_data[range_start:range_end])
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev.snapshot_date) - avg_x)
        * (selected.portfolio_value - prev.portfolio_value)
        -
        (EXTRACT(EPOCH FROM prev.snapshot_date)
         - EXTRACT(EPOCH FROM selected.snapshot_date))
        * (avg_y - prev.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        raw_data[range_start] := selected;
      END IF;
    END LOOP;

    result_data := result_data || raw_data[range_start];
    a := a + 1;
  END LOOP;

  -- Add last point
  result_data := result_data || raw_data[data_count];

  -- Return JSON
  SELECT jsonb_agg(to_jsonb(x))
  INTO final_result
  FROM unnest(result_data) x;

  RETURN final_result;
END;
$$;

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
  raw_data public.equity_point[];
  result_data public.equity_point[];

  data_count int;
  every numeric;

  i int;
  a int := 0;

  range_start int;
  range_end int;

  avg_x numeric;
  avg_y numeric;

  max_area numeric;
  point_area numeric;

  selected public.equity_point;
  prev public.equity_point;

  final_result jsonb;
BEGIN
  -- Load dataset into memory
  SELECT array_agg(
           ROW(snapshot_date, net_equity, cumulative_cashflow)::public.equity_point
           ORDER BY snapshot_date
         )
  INTO raw_data
  FROM public.daily_snapshots
  WHERE snapshot_date BETWEEN p_start_date AND p_end_date;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_agg(to_jsonb(x))
      FROM unnest(raw_data) x
    );
  END IF;

  result_data := ARRAY[ raw_data[1] ];
  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP

    range_start := floor(a * every)::int + 2;
    range_end := floor((a + 1) * every)::int + 1;

    IF range_end > data_count THEN
      range_end := data_count;
    END IF;

    SELECT
      AVG(EXTRACT(EPOCH FROM r.snapshot_date)),
      AVG(r.net_equity)
    INTO avg_x, avg_y
    FROM unnest(raw_data[range_start:range_end]) r;

    max_area := -1;
    prev := result_data[array_length(result_data,1)];

    FOR selected IN
      SELECT * FROM unnest(raw_data[range_start:range_end])
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev.snapshot_date) - avg_x)
        * (selected.net_equity - prev.net_equity)
        -
        (EXTRACT(EPOCH FROM prev.snapshot_date)
         - EXTRACT(EPOCH FROM selected.snapshot_date))
        * (avg_y - prev.net_equity)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        raw_data[range_start] := selected;
      END IF;
    END LOOP;

    result_data := result_data || raw_data[range_start];
    a := a + 1;
  END LOOP;

  result_data := result_data || raw_data[data_count];

  SELECT jsonb_agg(to_jsonb(x))
  INTO final_result
  FROM unnest(result_data) x;

  RETURN final_result;
END;
$$;