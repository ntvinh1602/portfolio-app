SET check_function_bodies = false;
DROP EXTENSION if exists pg_graphql;
DROP VIEW public.new_yearly_snapshots;
drop view public.equity_return_data;
drop view public.last_1y_profit;
DROP VIEW public.performance_data;
DROP VIEW public.yearly_snapshots;
DROP VIEW public.monthly_snapshots;
DROP MATERIALIZED VIEW public.daily_snapshots;
DROP MATERIALIZED VIEW public.new_daily_snapshots;
CREATE OR REPLACE FUNCTION public.calculate_twr(p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_twr NUMERIC;
BEGIN
  SELECT COALESCE(EXP(SUM(LN(1 + intraday_return))) - 1, 0)
    INTO v_twr
  FROM public.daily_snapshots
  WHERE user_id = auth.uid()
    AND snapshot_date >= p_start_date
    AND snapshot_date <= p_end_date
    AND intraday_return IS NOT NULL
    AND intraday_return > -1;   -- guard against ln(0) / ln(negative)

  RETURN COALESCE(v_twr, 0);
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_return_chart(p_start_date date, p_end_date date, p_threshold integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  WHERE a.ticker = '^VNINDEX'
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
      AND a.ticker = '^VNINDEX'
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
END;
$function$;
CREATE MATERIALIZED VIEW public.daily_snapshots AS WITH users AS (
         SELECT tx_entries.user_id,
            (min(tx_entries.created_at))::date AS start_date
           FROM public.tx_entries
          WHERE (tx_entries.user_id IS NOT NULL)
          GROUP BY tx_entries.user_id
        ), user_days AS (
         SELECT u.user_id,
            (gs.d)::date AS snapshot_date
           FROM (users u
             CROSS JOIN LATERAL generate_series((u.start_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval) gs(d))
          WHERE (EXTRACT(isodow FROM gs.d) <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), daily_deltas AS (
         SELECT e.user_id,
            (e.created_at)::date AS activity_date,
            tl.asset_id,
            a.currency_code,
            sum(tl.quantity) AS dq
           FROM ((public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
             JOIN public.assets a ON ((a.id = tl.asset_id)))
          WHERE (a.asset_class <> ALL (ARRAY['equity'::public.asset_class, 'liability'::public.asset_class]))
          GROUP BY e.user_id, ((e.created_at)::date), tl.asset_id, a.currency_code
        ), asset_intervals AS (
         SELECT daily_deltas.user_id,
            daily_deltas.asset_id,
            daily_deltas.currency_code,
            sum(daily_deltas.dq) OVER (PARTITION BY daily_deltas.user_id, daily_deltas.asset_id, daily_deltas.currency_code ORDER BY daily_deltas.activity_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_qty,
            daily_deltas.activity_date AS valid_from,
            COALESCE(lead(daily_deltas.activity_date) OVER (PARTITION BY daily_deltas.user_id, daily_deltas.asset_id, daily_deltas.currency_code ORDER BY daily_deltas.activity_date), 'infinity'::date) AS valid_to
           FROM daily_deltas
        ), positions AS (
         SELECT (gs.d)::date AS snapshot_date,
            ai.user_id,
            ai.asset_id,
            ai.currency_code,
            ai.cum_qty AS quantity
           FROM (asset_intervals ai
             CROSS JOIN LATERAL generate_series((ai.valid_from)::timestamp without time zone, (LEAST((ai.valid_to - 1), CURRENT_DATE))::timestamp without time zone, '1 day'::interval) gs(d))
          WHERE (EXTRACT(isodow FROM gs.d) <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), total_assets_per_day AS (
         SELECT pos.user_id,
            pos.snapshot_date,
            COALESCE(sum(((pos.quantity * COALESCE(pr.price, (1)::numeric)) * COALESCE(fx.rate, (1)::numeric))), (0)::numeric) AS total_assets
           FROM ((positions pos
             LEFT JOIN LATERAL ( SELECT hp.close AS price
                   FROM public.historical_prices hp
                  WHERE ((hp.asset_id = pos.asset_id) AND (hp.date <= pos.snapshot_date))
                  ORDER BY hp.date DESC
                 LIMIT 1) pr ON (true))
             LEFT JOIN LATERAL ( SELECT hf.rate
                   FROM public.historical_fxrate hf
                  WHERE ((hf.currency_code = pos.currency_code) AND (hf.date <= pos.snapshot_date))
                  ORDER BY hf.date DESC
                 LIMIT 1) fx ON (true))
          GROUP BY pos.user_id, pos.snapshot_date
        ), debt_events AS (
         SELECT e_b.user_id,
            b.tx_id AS borrow_tx_id,
            b.principal,
            b.rate,
            (e_b.created_at)::date AS borrow_date,
            (e_r.created_at)::date AS repay_date
           FROM (((public.tx_borrow b
             JOIN public.tx_entries e_b ON ((e_b.id = b.tx_id)))
             LEFT JOIN public.tx_repay r ON ((r.borrow_tx = b.tx_id)))
             LEFT JOIN public.tx_entries e_r ON ((e_r.id = r.tx_id)))
        ), debt_balances_by_day AS (
         SELECT d.snapshot_date,
            de.user_id,
            de.borrow_tx_id,
            de.principal,
            de.rate,
            de.borrow_date,
            de.repay_date,
                CASE
                    WHEN ((de.repay_date IS NOT NULL) AND (de.repay_date <= d.snapshot_date)) THEN (0)::numeric
                    ELSE (de.principal * power(((1)::numeric + ((de.rate / 100.0) / 365.0)), (GREATEST((d.snapshot_date - de.borrow_date), 0))::numeric))
                END AS balance_at_date
           FROM (debt_events de
             JOIN user_days d ON ((d.user_id = de.user_id)))
          WHERE (de.borrow_date <= d.snapshot_date)
        ), total_liabilities_per_day AS (
         SELECT debt_balances_by_day.user_id,
            debt_balances_by_day.snapshot_date,
            COALESCE(sum(debt_balances_by_day.balance_at_date), (0)::numeric) AS total_liabilities
           FROM debt_balances_by_day
          GROUP BY debt_balances_by_day.user_id, debt_balances_by_day.snapshot_date
        ), net_cashflow_per_day AS (
         SELECT e.user_id,
            (e.created_at)::date AS snapshot_date,
            COALESCE((sum(tl.credit) - sum(tl.debit)), (0)::numeric) AS net_cashflow
           FROM (((public.tx_entries e
             JOIN public.tx_legs tl ON ((tl.tx_id = e.id)))
             JOIN public.assets a ON ((a.id = tl.asset_id)))
             JOIN public.tx_cashflow cf ON ((cf.tx_id = e.id)))
          WHERE ((cf.operation = ANY (ARRAY['deposit'::public.cashflow_ops, 'withdraw'::public.cashflow_ops])) AND (a.asset_class = 'equity'::public.asset_class))
          GROUP BY e.user_id, ((e.created_at)::date)
        ), base AS (
         SELECT d.snapshot_date,
            d.user_id,
            COALESCE(nc.net_cashflow, (0)::numeric) AS net_cashflow,
            round((COALESCE(tad.total_assets, (0)::numeric) - COALESCE(tld.total_liabilities, (0)::numeric))) AS net_equity
           FROM (((user_days d
             LEFT JOIN total_assets_per_day tad ON (((tad.snapshot_date = d.snapshot_date) AND (tad.user_id = d.user_id))))
             LEFT JOIN total_liabilities_per_day tld ON (((tld.snapshot_date = d.snapshot_date) AND (tld.user_id = d.user_id))))
             LEFT JOIN net_cashflow_per_day nc ON (((nc.snapshot_date = d.snapshot_date) AND (nc.user_id = d.user_id))))
        ), with_returns AS (
         SELECT b.snapshot_date,
            b.user_id,
            b.net_equity,
            b.net_cashflow,
            round(COALESCE(sum(b.net_cashflow) OVER (PARTITION BY b.user_id ORDER BY b.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::numeric)) AS cumulative_cashflow,
                CASE
                    WHEN (lag(b.net_equity) OVER (PARTITION BY b.user_id ORDER BY b.snapshot_date) IS NULL) THEN (0)::numeric
                    WHEN (lag(b.net_equity) OVER (PARTITION BY b.user_id ORDER BY b.snapshot_date) = (0)::numeric) THEN (0)::numeric
                    ELSE (((b.net_equity - b.net_cashflow) - lag(b.net_equity) OVER (PARTITION BY b.user_id ORDER BY b.snapshot_date)) / NULLIF(lag(b.net_equity) OVER (PARTITION BY b.user_id ORDER BY b.snapshot_date), (0)::numeric))
                END AS intraday_return
           FROM base b
        )
 SELECT snapshot_date,
    user_id,
    net_equity,
    net_cashflow,
    cumulative_cashflow,
    intraday_return
   FROM with_returns WITH DATA;
CREATE VIEW public.monthly_snapshots WITH (security_invoker=true) AS WITH month_ranges AS (
         SELECT (date_trunc('month'::text, d.d))::date AS month_start,
            LEAST(((date_trunc('month'::text, d.d) + '1 mon -1 days'::interval))::date, CURRENT_DATE) AS month_end
           FROM generate_series('2021-11-01 00:00:00+00'::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) d(d)
        ), users AS (
         SELECT DISTINCT tx_entries.user_id
           FROM public.tx_entries
          WHERE (tx_entries.user_id IS NOT NULL)
        ), monthly_transactions AS (
         SELECT t.user_id,
            (date_trunc('month'::text, t.created_at))::date AS month,
            (COALESCE(sum(s.fee), (0)::numeric) + COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%fee%'::text)), (0)::numeric)) AS total_fees,
            COALESCE(sum(s.tax), (0)::numeric) AS total_taxes,
            COALESCE(sum(r.interest), (0)::numeric) AS loan_interest,
            COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%interest%'::text)), (0)::numeric) AS margin_interest
           FROM (((public.tx_entries t
             LEFT JOIN public.tx_repay r ON ((r.tx_id = t.id)))
             LEFT JOIN public.tx_stock s ON ((s.tx_id = t.id)))
             LEFT JOIN public.tx_cashflow cf ON ((cf.tx_id = t.id)))
          GROUP BY t.user_id, ((date_trunc('month'::text, t.created_at))::date)
        ), monthly_pnl AS (
         SELECT m_1.month_start,
            m_1.month_end,
            u_1.user_id,
            start_s.net_equity AS start_equity,
            end_s.net_equity AS end_equity,
            COALESCE(sum(ds.net_cashflow), (0)::numeric) AS cash_flow,
            ((COALESCE(end_s.net_equity, (0)::numeric) - COALESCE(start_s.net_equity, (0)::numeric)) - COALESCE(sum(ds.net_cashflow), (0)::numeric)) AS pnl
           FROM ((((month_ranges m_1
             CROSS JOIN users u_1)
             LEFT JOIN public.daily_snapshots ds ON (((ds.snapshot_date >= m_1.month_start) AND (ds.snapshot_date <= m_1.month_end) AND (ds.user_id = u_1.user_id))))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE ((s.user_id = u_1.user_id) AND (s.snapshot_date < m_1.month_start))
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) start_s ON (true))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE ((s.user_id = u_1.user_id) AND (s.snapshot_date <= m_1.month_end))
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) end_s ON (true))
          GROUP BY m_1.month_start, m_1.month_end, u_1.user_id, start_s.net_equity, end_s.net_equity
        )
 SELECT m.month_start AS snapshot_date,
    u.user_id,
    mp.pnl,
    (COALESCE(mt.loan_interest, (0)::numeric) + COALESCE(mt.margin_interest, (0)::numeric)) AS interest,
    COALESCE(mt.total_taxes, (0)::numeric) AS tax,
    COALESCE(mt.total_fees, (0)::numeric) AS fee
   FROM (((month_ranges m
     CROSS JOIN users u)
     LEFT JOIN monthly_pnl mp ON (((mp.month_start = m.month_start) AND (mp.user_id = u.user_id))))
     LEFT JOIN monthly_transactions mt ON (((mt.month = m.month_start) AND (mt.user_id = u.user_id))));
create view public.last_1y_profit
with
  (security_invoker = true) as
select
  round(sum(pnl)) as total_pnl,
  round(avg(pnl)) as avg_profit,
  - round(
    avg(
      COALESCE(interest, 0::numeric) + COALESCE(tax, 0::numeric) + COALESCE(fee, 0::numeric)
    )
  ) as avg_expense,
  jsonb_build_object(
    'snapshot_date',
    jsonb_agg(
      snapshot_date::text
      order by
        snapshot_date
    ),
    'revenue',
    jsonb_agg(
      COALESCE(pnl, 0::numeric) + COALESCE(fee, 0::numeric) + COALESCE(interest, 0::numeric) + COALESCE(tax, 0::numeric)
      order by
        snapshot_date
    ),
    'fee',
    jsonb_agg(
      COALESCE(- fee, 0::numeric)
      order by
        snapshot_date
    ),
    'interest',
    jsonb_agg(
      COALESCE(- interest, 0::numeric)
      order by
        snapshot_date
    ),
    'tax',
    jsonb_agg(
      COALESCE(- tax, 0::numeric)
      order by
        snapshot_date
    )
  ) as profit_chart
from
  (
    select
      ms2.snapshot_date,
      ms2.pnl,
      ms2.interest,
      ms2.tax,
      ms2.fee
    from
      monthly_snapshots ms2
    where
      ms2.user_id = auth.uid ()
    order by
      ms2.snapshot_date desc
    limit
      12
  ) ms;
create view public.equity_return_data
with
  (security_invoker = true) as
with
  periods as (
    select
      CURRENT_DATE as today,
      date_trunc(
        'year'::text,
        CURRENT_DATE::timestamp with time zone
      )::date as ytd_date,
      date_trunc(
        'month'::text,
        CURRENT_DATE::timestamp with time zone
      )::date as mtd_date,
      '2000-01-01'::date as inception_date,
      (CURRENT_DATE - '3 mons'::interval)::date as last3m_date,
      (CURRENT_DATE - '6 mons'::interval)::date as last6m_date,
      (CURRENT_DATE - '1 year'::interval)::date as last1y_date,
      (
        select
          min(ms.snapshot_date) as min
        from
          monthly_snapshots ms
        where
          ms.user_id = auth.uid ()
      ) as first_snapshot
  ),
  metrics as (
    select
      calculate_pnl (periods.ytd_date, periods.today) as pnl_ytd,
      calculate_pnl (periods.mtd_date, periods.today) as pnl_mtd,
      round(
        calculate_twr (periods.ytd_date, periods.today),
        3
      ) as twr_ytd,
      round(
        calculate_twr (periods.inception_date, periods.today),
        3
      ) as twr_all,
      periods.today,
      periods.inception_date,
      periods.first_snapshot
    from
      periods
  )
select
  m.pnl_ytd,
  m.pnl_mtd,
  m.twr_ytd,
  m.twr_all,
  b.total_equity,
  case
    when m.today > m.inception_date
    and m.first_snapshot is not null then round(
      power(
        1::numeric + m.twr_all,
        1.0 / ((m.today - m.first_snapshot)::numeric / 365.25)
      ) - 1::numeric,
      3
    )
    else null::numeric
  end as cagr,
  ec.equitychart,
  rc.returnchart
from
  metrics m
  cross join lateral (
    select
      round(sum(bs.total_value)) as total_equity
    from
      balance_sheet bs
    where
      bs.asset_class = 'equity'::asset_class
  ) b
  cross join lateral (
    select
      jsonb_build_object(
        'last_3m',
        get_equity_chart (p.last3m_date, p.today),
        'last_6m',
        get_equity_chart (p.last6m_date, p.today),
        'last_1y',
        get_equity_chart (p.last1y_date, p.today),
        'all',
        get_equity_chart (p.inception_date, p.today)
      ) as equitychart
    from
      periods p
  ) ec
  cross join lateral (
    select
      jsonb_build_object(
        'last_3m',
        get_return_chart (p.last3m_date, p.today),
        'last_6m',
        get_return_chart (p.last6m_date, p.today),
        'last_1y',
        get_return_chart (p.last1y_date, p.today),
        'all',
        get_return_chart (p.inception_date, p.today)
      ) as returnchart
    from
      periods p
  ) rc;
CREATE OR REPLACE VIEW public.yearly_snapshots WITH (security_invoker=true) AS WITH vn_asset AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = '^VNINDEX'::text)
        ), annual_cashflow AS (
         SELECT ds.user_id,
            (EXTRACT(year FROM ds.snapshot_date))::integer AS year,
            sum(GREATEST(ds.net_cashflow, (0)::numeric)) AS deposits,
            sum(LEAST(ds.net_cashflow, (0)::numeric)) AS withdrawals
           FROM public.daily_snapshots ds
          GROUP BY ds.user_id, ((EXTRACT(year FROM ds.snapshot_date))::integer)
        ), equity_returns AS (
         SELECT ds.user_id,
            (EXTRACT(year FROM ds.snapshot_date))::integer AS year,
            round((exp(sum(ln(((1)::numeric + GREATEST(ds.intraday_return, '-0.999999'::numeric))))) - (1)::numeric), 3) AS equity_ret
           FROM public.daily_snapshots ds
          WHERE (ds.intraday_return IS NOT NULL)
          GROUP BY ds.user_id, ((EXTRACT(year FROM ds.snapshot_date))::integer)
        ), vn_ranked AS (
         SELECT (EXTRACT(year FROM hp.date))::integer AS year,
            hp.close,
            row_number() OVER (PARTITION BY (EXTRACT(year FROM hp.date)) ORDER BY hp.date) AS rn_start,
            row_number() OVER (PARTITION BY (EXTRACT(year FROM hp.date)) ORDER BY hp.date DESC) AS rn_end
           FROM (public.historical_prices hp
             CROSS JOIN vn_asset va)
          WHERE (hp.asset_id = va.id)
        ), vn_returns AS (
         SELECT t.year,
            round(
                CASE
                    WHEN (t.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE ((t.last_value - t.first_value) / t.first_value)
                END, 3) AS vn_ret
           FROM ( SELECT vn_ranked.year,
                    max(vn_ranked.close) FILTER (WHERE (vn_ranked.rn_start = 1)) AS first_value,
                    max(vn_ranked.close) FILTER (WHERE (vn_ranked.rn_end = 1)) AS last_value
                   FROM vn_ranked
                  GROUP BY vn_ranked.year) t
        ), yearly_combined AS (
         SELECT COALESCE(e.user_id, ac.user_id) AS user_id,
            COALESCE(e.year, ac.year) AS year,
            e.equity_ret,
            v.vn_ret,
            ac.deposits,
            ac.withdrawals
           FROM ((equity_returns e
             FULL JOIN annual_cashflow ac ON (((ac.user_id = e.user_id) AND (ac.year = e.year))))
             FULL JOIN vn_returns v ON ((v.year = COALESCE(e.year, ac.year))))
        ), all_time_cashflow AS (
         SELECT ds.user_id,
            sum(GREATEST(ds.net_cashflow, (0)::numeric)) AS deposits,
            sum(LEAST(ds.net_cashflow, (0)::numeric)) AS withdrawals
           FROM public.daily_snapshots ds
          GROUP BY ds.user_id
        ), all_time_equity AS (
         SELECT ds.user_id,
            round((exp(sum(ln(((1)::numeric + GREATEST(ds.intraday_return, '-0.999999'::numeric))))) - (1)::numeric), 3) AS equity_ret
           FROM public.daily_snapshots ds
          WHERE (ds.intraday_return IS NOT NULL)
          GROUP BY ds.user_id
        ), all_time_vn AS (
         SELECT round(
                CASE
                    WHEN (t2.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE ((t2.last_value - t2.first_value) / t2.first_value)
                END, 3) AS vn_ret
           FROM ( SELECT max(t.close) FILTER (WHERE (t.rn_start = 1)) AS first_value,
                    max(t.close) FILTER (WHERE (t.rn_end = 1)) AS last_value
                   FROM ( SELECT hp.close,
                            row_number() OVER (ORDER BY hp.date) AS rn_start,
                            row_number() OVER (ORDER BY hp.date DESC) AS rn_end
                           FROM (public.historical_prices hp
                             CROSS JOIN vn_asset va)
                          WHERE (hp.asset_id = va.id)) t) t2
        ), all_time AS (
         SELECT ate.user_id,
            9999 AS year,
            atc.deposits,
            atc.withdrawals,
            ate.equity_ret,
            atv.vn_ret
           FROM ((all_time_cashflow atc
             JOIN all_time_equity ate ON ((ate.user_id = atc.user_id)))
             CROSS JOIN all_time_vn atv)
        )
 SELECT yc.user_id,
    yc.year,
    yc.deposits,
    yc.withdrawals,
    yc.equity_ret,
    yc.vn_ret
   FROM yearly_combined yc
UNION ALL
 SELECT at.user_id,
    at.year,
    at.deposits,
    at.withdrawals,
    at.equity_ret,
    at.vn_ret
   FROM all_time at;
CREATE VIEW public.performance_data WITH (security_invoker=true) AS WITH stock_base AS (
         SELECT sap.user_id,
            sap.year,
            jsonb_agg(jsonb_build_object('ticker', sap.ticker, 'name', sap.name, 'logo_url', sap.logo_url, 'total_pnl', sap.total_pnl) ORDER BY sap.ticker) AS stock_pnl
           FROM public.stock_annual_pnl sap
          WHERE (sap.user_id = auth.uid())
          GROUP BY sap.user_id, sap.year
        ), stock_all_time AS (
         SELECT sap.user_id,
            9999 AS year,
            jsonb_agg(jsonb_build_object('ticker', sap.ticker, 'name', sap.name, 'logo_url', sap.logo_url, 'total_pnl', sap.total_pnl) ORDER BY sap.ticker) AS stock_pnl
           FROM ( SELECT sap_1.user_id,
                    sap_1.ticker,
                    sap_1.name,
                    sap_1.logo_url,
                    sum(sap_1.total_pnl) AS total_pnl
                   FROM public.stock_annual_pnl sap_1
                  WHERE (sap_1.user_id = auth.uid())
                  GROUP BY sap_1.user_id, sap_1.ticker, sap_1.name, sap_1.logo_url) sap
          GROUP BY sap.user_id
        ), profit_base AS (
         SELECT ms.user_id,
            (EXTRACT(year FROM ms.snapshot_date))::integer AS year,
            round(sum(ms.pnl)) AS total_pnl,
            round(avg(ms.pnl)) AS avg_profit,
            round((- avg(((COALESCE(ms.interest, (0)::numeric) + COALESCE(ms.tax, (0)::numeric)) + COALESCE(ms.fee, (0)::numeric))))) AS avg_expense,
            jsonb_build_object('snapshot_date', jsonb_agg((ms.snapshot_date)::text ORDER BY ms.snapshot_date), 'revenue', jsonb_agg(round((((COALESCE(ms.pnl, (0)::numeric) + COALESCE(ms.fee, (0)::numeric)) + COALESCE(ms.interest, (0)::numeric)) + COALESCE(ms.tax, (0)::numeric))) ORDER BY ms.snapshot_date), 'fee', jsonb_agg(round(COALESCE((- ms.fee), (0)::numeric)) ORDER BY ms.snapshot_date), 'interest', jsonb_agg(round(COALESCE((- ms.interest), (0)::numeric)) ORDER BY ms.snapshot_date), 'tax', jsonb_agg(round(COALESCE((- ms.tax), (0)::numeric)) ORDER BY ms.snapshot_date)) AS profit_chart
           FROM public.monthly_snapshots ms
          WHERE (ms.user_id = auth.uid())
          GROUP BY ms.user_id, (EXTRACT(year FROM ms.snapshot_date))
        ), profit_all_time AS (
         SELECT yearly.user_id,
            9999 AS year,
            round(sum(yearly.sum_pnl)) AS total_pnl,
            round(avg(yearly.sum_pnl)) AS avg_profit,
            round((- avg(((COALESCE(yearly.sum_interest, (0)::numeric) + COALESCE(yearly.sum_tax, (0)::numeric)) + COALESCE(yearly.sum_fee, (0)::numeric))))) AS avg_expense,
            jsonb_build_object('snapshot_date', jsonb_agg((yearly.year)::text ORDER BY yearly.year), 'revenue', jsonb_agg((((COALESCE(yearly.sum_pnl, (0)::numeric) + COALESCE(yearly.sum_fee, (0)::numeric)) + COALESCE(yearly.sum_interest, (0)::numeric)) + COALESCE(yearly.sum_tax, (0)::numeric)) ORDER BY yearly.year), 'fee', jsonb_agg(COALESCE((- yearly.sum_fee), (0)::numeric) ORDER BY yearly.year), 'interest', jsonb_agg(COALESCE((- yearly.sum_interest), (0)::numeric) ORDER BY yearly.year), 'tax', jsonb_agg(COALESCE((- yearly.sum_tax), (0)::numeric) ORDER BY yearly.year)) AS profit_chart
           FROM ( SELECT ms.user_id,
                    (EXTRACT(year FROM ms.snapshot_date))::integer AS year,
                    sum(ms.pnl) AS sum_pnl,
                    sum(ms.fee) AS sum_fee,
                    sum(ms.interest) AS sum_interest,
                    sum(ms.tax) AS sum_tax
                   FROM public.monthly_snapshots ms
                  WHERE (ms.user_id = auth.uid())
                  GROUP BY ms.user_id, (EXTRACT(year FROM ms.snapshot_date))) yearly
          GROUP BY yearly.user_id
        ), date_bounds AS (
         SELECT y.user_id,
            y.year,
                CASE
                    WHEN (y.year = 9999) THEN ( SELECT min(ds.snapshot_date) AS min
                       FROM public.daily_snapshots ds
                      WHERE (ds.user_id = y.user_id))
                    ELSE make_date(y.year, 1, 1)
                END AS start_date,
                CASE
                    WHEN (y.year = 9999) THEN ( SELECT max(ds.snapshot_date) AS max
                       FROM public.daily_snapshots ds
                      WHERE (ds.user_id = y.user_id))
                    ELSE make_date(y.year, 12, 31)
                END AS end_date
           FROM ( SELECT sb.user_id,
                    sb.year
                   FROM stock_base sb
                UNION
                 SELECT sat.user_id,
                    sat.year
                   FROM stock_all_time sat) y
        ), combined AS (
         SELECT b.user_id,
            b.year,
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
             LEFT JOIN profit_base p ON (((p.user_id = b.user_id) AND (p.year = b.year))))
             LEFT JOIN public.yearly_snapshots ys ON (((ys.user_id = b.user_id) AND (ys.year = b.year))))
        UNION ALL
         SELECT s.user_id,
            s.year,
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
             LEFT JOIN profit_all_time p ON (((p.user_id = s.user_id) AND (p.year = s.year))))
             LEFT JOIN public.yearly_snapshots ys ON (((ys.user_id = s.user_id) AND (ys.year = s.year))))
        )
 SELECT c.user_id,
    c.year,
    c.stock_pnl,
    c.total_pnl,
    c.avg_profit,
    c.avg_expense,
    c.profit_chart,
    c.deposits,
    c.withdrawals,
    c.equity_ret,
    c.vn_ret,
    public.get_return_chart(db.start_date, db.end_date) AS return_chart
   FROM (combined c
     JOIN date_bounds db ON (((db.user_id = c.user_id) AND (db.year = c.year))));
