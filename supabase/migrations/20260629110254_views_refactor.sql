drop materialized view if exists "public"."dashboard_data";

drop materialized view if exists "public"."recaps_data";

drop view if exists "public"."stock_holdings";

set check_function_bodies = off;

create or replace view "public"."last_1y_profit" with (security_invoker = true) as  SELECT round(sum(pnl)) AS total_pnl,
    round(avg(pnl)) AS avg_profit,
    (- round(avg(((COALESCE(interest, (0)::numeric) + COALESCE(tax, (0)::numeric)) + COALESCE(fee, (0)::numeric))))) AS avg_expense,
    jsonb_build_object('snapshot_date', jsonb_agg((snapshot_date)::text ORDER BY snapshot_date), 'revenue', jsonb_agg((((COALESCE(pnl, (0)::numeric) + COALESCE(fee, (0)::numeric)) + COALESCE(interest, (0)::numeric)) + COALESCE(tax, (0)::numeric)) ORDER BY snapshot_date), 'fee', jsonb_agg(COALESCE((- fee), (0)::numeric) ORDER BY snapshot_date), 'interest', jsonb_agg(COALESCE((- interest), (0)::numeric) ORDER BY snapshot_date), 'tax', jsonb_agg(COALESCE((- tax), (0)::numeric) ORDER BY snapshot_date)) AS profit_chart
   FROM ( SELECT monthly_snapshots.snapshot_date,
            monthly_snapshots.pnl,
            monthly_snapshots.interest,
            monthly_snapshots.tax,
            monthly_snapshots.fee
           FROM public.monthly_snapshots
          ORDER BY monthly_snapshots.snapshot_date DESC
         LIMIT 12) unnamed_subquery;


CREATE OR REPLACE FUNCTION public.calculate_pnl(p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_start_equity NUMERIC;
  v_end_equity NUMERIC;
  v_cash_flow NUMERIC;
  v_pnl NUMERIC;
BEGIN
  -- Get starting equity (closing equity of the day before the start date)
  SELECT net_equity INTO v_start_equity
  FROM public.daily_snapshots
  WHERE snapshot_date < p_start_date
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- If no prior snapshot, this is the first month.
  -- Use the opening equity of the first day as the starting equity.
  IF v_start_equity IS NULL THEN
    SELECT (net_equity - net_cashflow) INTO v_start_equity
    FROM public.daily_snapshots
    WHERE snapshot_date >= p_start_date
    ORDER BY snapshot_date ASC
    LIMIT 1;
  END IF;

  -- Get ending equity (closing equity of the end date)
  SELECT net_equity INTO v_end_equity
  FROM public.daily_snapshots
  WHERE snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Get net cash flow for the period
  SELECT COALESCE(SUM(net_cashflow), 0) INTO v_cash_flow
  FROM public.daily_snapshots
  WHERE snapshot_date >= p_start_date AND snapshot_date <= p_end_date;

  -- Calculate PnL
  v_pnl := round((COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow);

  RETURN v_pnl;
END;$function$
;

CREATE OR REPLACE FUNCTION public.calculate_twr(p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_start_index NUMERIC;
  v_end_index NUMERIC;
  v_twr NUMERIC;
BEGIN
  -- Get the equity index from the day before the start date
  SELECT equity_index INTO v_start_index
  FROM public.daily_snapshots
  WHERE snapshot_date < p_start_date
  ORDER BY snapshot_date DESC
  LIMIT 1;
  -- If no prior snapshot, this is the first month.
  -- The starting index is conceptually 100 before the first day.
  IF v_start_index IS NULL THEN v_start_index := 100;
  END IF;
  -- Get the equity index at the end of the period
  SELECT equity_index INTO v_end_index
  FROM public.daily_snapshots
  WHERE snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC
  LIMIT 1;
  -- If there's no data for the period, return 0
  IF v_end_index IS NULL THEN RETURN 0;
  END IF;
  -- Calculate TWR as the percentage change in the equity index
  v_twr := round(((v_end_index / v_start_index) - 1) * 100, 1);
  RETURN v_twr;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_equity_chart(p_start_date date, p_end_date date, p_threshold integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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
      SELECT jsonb_build_object(
        'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
        'e', jsonb_agg(round(x.net_equity)               ORDER BY x.ord),
        'c', jsonb_agg(round(x.cumulative_cashflow)                ORDER BY x.ord)
      )
      FROM unnest(raw_data) WITH ORDINALITY
          AS x(snapshot_date, net_equity, cumulative_cashflow, ord)
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

  SELECT jsonb_build_object(
    'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
    'e', jsonb_agg(round(x.net_equity)               ORDER BY x.ord),
    'c', jsonb_agg(round(x.cumulative_cashflow)                ORDER BY x.ord)
  )
  INTO final_result
  FROM unnest(result_data) WITH ORDINALITY
      AS x(snapshot_date, net_equity, cumulative_cashflow, ord);

  RETURN final_result;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_return_chart(p_start_date date, p_end_date date, p_threshold integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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

  SELECT hp.close
  INTO v_first_vni_value
  FROM historical_prices hp
    join assets a on a.id = hp.asset_id
  WHERE a.ticker = '^VNINDEX'
    AND hp.date >= p_start_date
  ORDER BY hp.date
  LIMIT 1;

  -- Load dataset into memory array
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
      (hp.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM daily_snapshots pd
    JOIN historical_prices hp ON pd.snapshot_date = hp.date
    join assets a on a.id = hp.asset_id
    WHERE pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND a.ticker = '^VNINDEX'
  ) t;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- If below threshold → return full set
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
  SELECT jsonb_build_object(
    'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
    'p', jsonb_agg(round(x.portfolio_value, 2)                      ORDER BY x.ord),
    'v', jsonb_agg(round(x.vni_value, 2)                            ORDER BY x.ord)
  )
  INTO final_result
  FROM unnest(result_data) WITH ORDINALITY
      AS x(snapshot_date, portfolio_value, vni_value, ord);

  RETURN final_result;
END;$function$
;

create or replace view "public"."equity_return_data" with (security_invoker = true) as  WITH periods AS (
         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS ytd_date,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS mtd_date,
            '2000-01-01'::date AS inception_date,
            ((CURRENT_DATE - '3 mons'::interval))::date AS last3m_date,
            ((CURRENT_DATE - '6 mons'::interval))::date AS last6m_date,
            ((CURRENT_DATE - '1 year'::interval))::date AS last1y_date,
            ( SELECT min(monthly_snapshots.snapshot_date) AS min
                   FROM public.monthly_snapshots) AS first_snapshot
        ), metrics AS (
         SELECT public.calculate_pnl(periods.ytd_date, periods.today) AS pnl_ytd,
            public.calculate_pnl(periods.mtd_date, periods.today) AS pnl_mtd,
            public.calculate_twr(periods.ytd_date, periods.today) AS twr_ytd,
            public.calculate_twr(periods.inception_date, periods.today) AS twr_all,
            periods.today,
            periods.inception_date,
            periods.first_snapshot
           FROM periods
        )
 SELECT m.pnl_ytd,
    m.pnl_mtd,
    m.twr_ytd,
    m.twr_all,
    b.total_equity,
        CASE
            WHEN ((m.today > m.inception_date) AND (m.first_snapshot IS NOT NULL)) THEN round(((power(((1)::numeric + (m.twr_all / 100.0)), (1.0 / (((m.today - m.first_snapshot))::numeric / 365.25))) - (1)::numeric) * 100.0), 1)
            ELSE NULL::numeric
        END AS cagr,
    ec.equitychart,
    rc.returnchart
   FROM (((metrics m
     CROSS JOIN LATERAL ( SELECT round(sum(balance_sheet.total_value)) AS total_equity
           FROM public.balance_sheet
          WHERE (balance_sheet.asset_class = 'equity'::public.asset_class)) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(p.last3m_date, p.today, 150), 'last_6m', public.get_equity_chart(p.last6m_date, p.today, 150), 'last_1y', public.get_equity_chart(p.last1y_date, p.today, 150), 'all', public.get_equity_chart(p.inception_date, p.today, 150)) AS equitychart
           FROM periods p) ec)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_return_chart(p.last3m_date, p.today, 150), 'last_6m', public.get_return_chart(p.last6m_date, p.today, 150), 'last_1y', public.get_return_chart(p.last1y_date, p.today, 150), 'all', public.get_return_chart(p.inception_date, p.today, 150)) AS returnchart
           FROM periods p) rc);


create or replace view "public"."performance_data" with (security_invoker = true) as  WITH stock_base AS (
         SELECT stock_annual_pnl.year,
            jsonb_agg(jsonb_build_object('ticker', stock_annual_pnl.ticker, 'name', stock_annual_pnl.name, 'logo_url', stock_annual_pnl.logo_url, 'total_pnl', stock_annual_pnl.total_pnl) ORDER BY stock_annual_pnl.ticker) AS stock_pnl
           FROM public.stock_annual_pnl
          GROUP BY stock_annual_pnl.year
        ), stock_all_time AS (
         SELECT 9999 AS year,
            jsonb_agg(jsonb_build_object('ticker', agg.ticker, 'name', agg.name, 'logo_url', agg.logo_url, 'total_pnl', agg.total_pnl) ORDER BY agg.ticker) AS stock_pnl
           FROM ( SELECT stock_annual_pnl.ticker,
                    stock_annual_pnl.name,
                    stock_annual_pnl.logo_url,
                    sum(stock_annual_pnl.total_pnl) AS total_pnl
                   FROM public.stock_annual_pnl
                  GROUP BY stock_annual_pnl.ticker, stock_annual_pnl.name, stock_annual_pnl.logo_url) agg
        ), profit_base AS (
         SELECT (EXTRACT(year FROM ms.snapshot_date))::integer AS year,
            round(sum(ms.pnl)) AS total_pnl,
            round(avg(ms.pnl)) AS avg_profit,
            round((- avg(((COALESCE(ms.interest, (0)::numeric) + COALESCE(ms.tax, (0)::numeric)) + COALESCE(ms.fee, (0)::numeric))))) AS avg_expense,
            jsonb_build_object('snapshot_date', jsonb_agg((ms.snapshot_date)::text ORDER BY ms.snapshot_date), 'revenue', jsonb_agg(round((((COALESCE(ms.pnl, (0)::numeric) + COALESCE(ms.fee, (0)::numeric)) + COALESCE(ms.interest, (0)::numeric)) + COALESCE(ms.tax, (0)::numeric))) ORDER BY ms.snapshot_date), 'fee', jsonb_agg(round(COALESCE((- ms.fee), (0)::numeric)) ORDER BY ms.snapshot_date), 'interest', jsonb_agg(round(COALESCE((- ms.interest), (0)::numeric)) ORDER BY ms.snapshot_date), 'tax', jsonb_agg(round(COALESCE((- ms.tax), (0)::numeric)) ORDER BY ms.snapshot_date)) AS profit_chart
           FROM public.monthly_snapshots ms
          GROUP BY (EXTRACT(year FROM ms.snapshot_date))
        ), profit_all_time AS (
         SELECT 9999 AS year,
            round(sum(yearly.sum_pnl)) AS total_pnl,
            round(avg(yearly.sum_pnl)) AS avg_profit,
            round((- avg(((COALESCE(yearly.sum_interest, (0)::numeric) + COALESCE(yearly.sum_tax, (0)::numeric)) + COALESCE(yearly.sum_fee, (0)::numeric))))) AS avg_expense,
            jsonb_build_object('snapshot_date', jsonb_agg((yearly.year)::text ORDER BY yearly.year), 'revenue', jsonb_agg((((COALESCE(yearly.sum_pnl, (0)::numeric) + COALESCE(yearly.sum_fee, (0)::numeric)) + COALESCE(yearly.sum_interest, (0)::numeric)) + COALESCE(yearly.sum_tax, (0)::numeric)) ORDER BY yearly.year), 'fee', jsonb_agg(COALESCE((- yearly.sum_fee), (0)::numeric) ORDER BY yearly.year), 'interest', jsonb_agg(COALESCE((- yearly.sum_interest), (0)::numeric) ORDER BY yearly.year), 'tax', jsonb_agg(COALESCE((- yearly.sum_tax), (0)::numeric) ORDER BY yearly.year)) AS profit_chart
           FROM ( SELECT (EXTRACT(year FROM ms.snapshot_date))::integer AS year,
                    sum(ms.pnl) AS sum_pnl,
                    sum(ms.fee) AS sum_fee,
                    sum(ms.interest) AS sum_interest,
                    sum(ms.tax) AS sum_tax
                   FROM public.monthly_snapshots ms
                  GROUP BY (EXTRACT(year FROM ms.snapshot_date))) yearly
        ), date_bounds AS (
         SELECT y.year,
                CASE
                    WHEN (y.year = 9999) THEN ( SELECT min(daily_snapshots.snapshot_date) AS min
                       FROM public.daily_snapshots)
                    ELSE make_date(y.year, 1, 1)
                END AS start_date,
                CASE
                    WHEN (y.year = 9999) THEN ( SELECT max(daily_snapshots.snapshot_date) AS max
                       FROM public.daily_snapshots)
                    ELSE make_date(y.year, 12, 31)
                END AS end_date
           FROM ( SELECT stock_base.year
                   FROM stock_base
                UNION
                 SELECT stock_all_time.year
                   FROM stock_all_time) y
        ), combined AS (
         SELECT b.year,
            b.stock_pnl,
            p.total_pnl,
            p.avg_profit,
            p.avg_expense,
            p.profit_chart,
            ys.deposits,
            ys.withdrawals,
            ys.equity_ret,
            ys.vn_ret
           FROM ((stock_base b
             LEFT JOIN profit_base p USING (year))
             LEFT JOIN public.yearly_snapshots ys USING (year))
        UNION ALL
         SELECT s.year,
            s.stock_pnl,
            p.total_pnl,
            p.avg_profit,
            p.avg_expense,
            p.profit_chart,
            ys.deposits,
            ys.withdrawals,
            ys.equity_ret,
            ys.vn_ret
           FROM ((stock_all_time s
             LEFT JOIN profit_all_time p USING (year))
             LEFT JOIN public.yearly_snapshots ys USING (year))
        )
 SELECT c.year,
    c.stock_pnl,
    c.total_pnl,
    c.avg_profit,
    c.avg_expense,
    c.profit_chart,
    c.deposits,
    c.withdrawals,
    c.equity_ret,
    c.vn_ret,
    public.get_return_chart(db.start_date, db.end_date, 150) AS return_chart
   FROM (combined c
     JOIN date_bounds db USING (year));



