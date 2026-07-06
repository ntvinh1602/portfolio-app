SET check_function_bodies = false;
DROP EXTENSION pg_graphql;
CREATE OR REPLACE FUNCTION public.get_return_chart(p_start_date date, p_end_date date, p_threshold integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
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
  -- VNI normalization anchor (first close in range)
  SELECT hp.close
  INTO v_first_vni_value
  FROM historical_prices hp
    JOIN assets a ON a.id = hp.asset_id
  WHERE a.ticker = 'VNINDEX'
    AND hp.date >= p_start_date
  ORDER BY hp.date
  LIMIT 1;

  -- Load dataset into memory array.
  -- Portfolio value is chain-linked from daily returns and rebased to 100.
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      100 * EXP(
        SUM(LN(1 + GREATEST(pd.intraday_return, -0.999999)))
          OVER (ORDER BY pd.snapshot_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      ) AS portfolio_value,
      (hp.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM daily_snapshots pd
      JOIN historical_prices hp ON pd.snapshot_date = hp.date
      JOIN assets a ON a.id = hp.asset_id
    WHERE pd.user_id = auth.uid()
      AND pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND a.ticker = 'VNINDEX'
      AND pd.intraday_return IS NOT NULL
  ) t;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_build_object(
        'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
        'p', jsonb_agg(round(x.portfolio_value, 2)                      ORDER BY x.ord),
        'v', jsonb_agg(round(x.vni_value, 2)                            ORDER BY x.ord)
      )
      FROM unnest(raw_data) WITH ORDINALITY
          AS x(snapshot_date, portfolio_value, vni_value, ord)
    );
  END IF;

  -- LTTB sampling (unchanged)
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

  result_data := result_data || raw_data[data_count];

  SELECT jsonb_build_object(
    'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
    'p', jsonb_agg(round(x.portfolio_value, 2)                      ORDER BY x.ord),
    'v', jsonb_agg(round(x.vni_value, 2)                            ORDER BY x.ord)
  )
  INTO final_result
  FROM unnest(result_data) WITH ORDINALITY
      AS x(snapshot_date, portfolio_value, vni_value, ord);

  RETURN final_result;
END;$function$;
CREATE OR REPLACE VIEW public.benchmark_all WITH (security_invoker=true) AS WITH vnindex AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = 'VNINDEX'::text)
        ), date_bound AS (
         SELECT min(daily_snapshots.snapshot_date) AS first_date,
            max(daily_snapshots.snapshot_date) AS last_date
           FROM public.daily_snapshots
        )
 SELECT public.get_return_chart(db.first_date, db.last_date) AS return_chart,
    round(public.calculate_twr(db.first_date, db.last_date), 3) AS equity_ret,
    round(((hp_last.close / hp_first.close) - (1)::numeric), 3) AS vn_ret
   FROM (((date_bound db
     CROSS JOIN vnindex v)
     LEFT JOIN LATERAL ( SELECT hp.date,
            hp.close
           FROM public.historical_prices hp
          WHERE (hp.asset_id = v.id)
          ORDER BY (hp.date < db.first_date) DESC,
                CASE
                    WHEN (hp.date < db.first_date) THEN hp.date
                    ELSE NULL::date
                END DESC, hp.date
         LIMIT 1) hp_first ON (true))
     LEFT JOIN LATERAL ( SELECT hp.date,
            hp.close
           FROM public.historical_prices hp
          WHERE ((hp.asset_id = v.id) AND (hp.date = db.last_date))
         LIMIT 1) hp_last ON (true));
CREATE OR REPLACE VIEW public.benchmark_yearly WITH (security_invoker=true) AS WITH vnindex AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = 'VNINDEX'::text)
        ), date_bound AS (
         SELECT ds.year,
            min(ds.snapshot_date) AS first_date,
            max(ds.snapshot_date) AS last_date
           FROM ( SELECT daily_snapshots.snapshot_date,
                    EXTRACT(year FROM daily_snapshots.snapshot_date) AS year
                   FROM public.daily_snapshots) ds
          GROUP BY ds.year
        )
 SELECT db.year,
    public.get_return_chart(db.first_date, db.last_date) AS return_chart,
    round(public.calculate_twr(db.first_date, db.last_date), 3) AS equity_ret,
    round(((hp_last.close / hp_first.close) - (1)::numeric), 3) AS vn_ret
   FROM (((date_bound db
     CROSS JOIN vnindex v)
     LEFT JOIN LATERAL ( SELECT hp.date,
            hp.close
           FROM public.historical_prices hp
          WHERE (hp.asset_id = v.id)
          ORDER BY (hp.date < db.first_date) DESC,
                CASE
                    WHEN (hp.date < db.first_date) THEN hp.date
                    ELSE NULL::date
                END DESC, hp.date
         LIMIT 1) hp_first ON (true))
     LEFT JOIN LATERAL ( SELECT hp.date,
            hp.close
           FROM public.historical_prices hp
          WHERE ((hp.asset_id = v.id) AND (hp.date = db.last_date))
         LIMIT 1) hp_last ON (true))
  ORDER BY db.year;
