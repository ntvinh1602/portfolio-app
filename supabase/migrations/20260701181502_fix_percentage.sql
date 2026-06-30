set check_function_bodies = off;

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
  SELECT net_equity INTO v_start_equity
  FROM public.daily_snapshots
  WHERE user_id = auth.uid() AND snapshot_date < p_start_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_start_equity IS NULL THEN
    SELECT (net_equity - net_cashflow) INTO v_start_equity
    FROM public.daily_snapshots
    WHERE user_id = auth.uid() AND snapshot_date >= p_start_date
    ORDER BY snapshot_date ASC LIMIT 1;
  END IF;

  SELECT net_equity INTO v_end_equity
  FROM public.daily_snapshots
  WHERE user_id = auth.uid() AND snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT COALESCE(SUM(net_cashflow), 0) INTO v_cash_flow
  FROM public.daily_snapshots
  WHERE user_id = auth.uid()
    AND snapshot_date >= p_start_date AND snapshot_date <= p_end_date;

  v_pnl := COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0) - v_cash_flow;
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
  SELECT equity_index INTO v_start_index
  FROM public.daily_snapshots
  WHERE user_id = auth.uid() AND snapshot_date < p_start_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_start_index IS NULL THEN v_start_index := 100; END IF;

  SELECT equity_index INTO v_end_index
  FROM public.daily_snapshots
  WHERE user_id = auth.uid() AND snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_end_index IS NULL THEN RETURN 0; END IF;

  v_twr := v_end_index / v_start_index - 1;
  RETURN v_twr;
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
            ( SELECT min(ms.snapshot_date) AS min
                   FROM public.monthly_snapshots ms
                  WHERE (ms.user_id = auth.uid())) AS first_snapshot
        ), metrics AS (
         SELECT public.calculate_pnl(periods.ytd_date, periods.today) AS pnl_ytd,
            public.calculate_pnl(periods.mtd_date, periods.today) AS pnl_mtd,
            round(public.calculate_twr(periods.ytd_date, periods.today), 3) AS twr_ytd,
            round(public.calculate_twr(periods.inception_date, periods.today), 3) AS twr_all,
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
            WHEN ((m.today > m.inception_date) AND (m.first_snapshot IS NOT NULL)) THEN round((power(((1)::numeric + m.twr_all), (1.0 / (((m.today - m.first_snapshot))::numeric / 365.25))) - (1)::numeric), 3)
            ELSE NULL::numeric
        END AS cagr,
    ec.equitychart,
    rc.returnchart
   FROM (((metrics m
     CROSS JOIN LATERAL ( SELECT round(sum(bs.total_value)) AS total_equity
           FROM public.balance_sheet bs
          WHERE (bs.asset_class = 'equity'::public.asset_class)) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(p.last3m_date, p.today), 'last_6m', public.get_equity_chart(p.last6m_date, p.today), 'last_1y', public.get_equity_chart(p.last1y_date, p.today), 'all', public.get_equity_chart(p.inception_date, p.today)) AS equitychart
           FROM periods p) ec)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_return_chart(p.last3m_date, p.today), 'last_6m', public.get_return_chart(p.last6m_date, p.today), 'last_1y', public.get_return_chart(p.last1y_date, p.today), 'all', public.get_return_chart(p.inception_date, p.today)) AS returnchart
           FROM periods p) rc);


create or replace view "public"."yearly_snapshots" with (security_invoker = true) as  WITH users AS (
         SELECT DISTINCT tx_entries.user_id
           FROM public.tx_entries
          WHERE (tx_entries.user_id IS NOT NULL)
        ), vn_asset AS (
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
        ), equity_ranked AS (
         SELECT ds.user_id,
            (EXTRACT(year FROM ds.snapshot_date))::integer AS year,
            ds.equity_index,
            row_number() OVER (PARTITION BY ds.user_id, (EXTRACT(year FROM ds.snapshot_date)) ORDER BY ds.snapshot_date) AS rn_start,
            row_number() OVER (PARTITION BY ds.user_id, (EXTRACT(year FROM ds.snapshot_date)) ORDER BY ds.snapshot_date DESC) AS rn_end
           FROM public.daily_snapshots ds
          WHERE (ds.equity_index IS NOT NULL)
        ), equity_returns AS (
         SELECT t.user_id,
            t.year,
            round(
                CASE
                    WHEN (t.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE ((t.last_value - t.first_value) / t.first_value)
                END, 3) AS equity_ret
           FROM ( SELECT equity_ranked.user_id,
                    equity_ranked.year,
                    max(equity_ranked.equity_index) FILTER (WHERE (equity_ranked.rn_start = 1)) AS first_value,
                    max(equity_ranked.equity_index) FILTER (WHERE (equity_ranked.rn_end = 1)) AS last_value
                   FROM equity_ranked
                  GROUP BY equity_ranked.user_id, equity_ranked.year) t
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
         SELECT t.user_id,
            round(
                CASE
                    WHEN (t.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE ((t.last_value - t.first_value) / t.first_value)
                END, 3) AS equity_ret
           FROM ( SELECT ds.user_id,
                    max(ds.equity_index) FILTER (WHERE (ds.rn_start = 1)) AS first_value,
                    max(ds.equity_index) FILTER (WHERE (ds.rn_end = 1)) AS last_value
                   FROM ( SELECT ds2.user_id,
                            ds2.equity_index,
                            row_number() OVER (PARTITION BY ds2.user_id ORDER BY ds2.snapshot_date) AS rn_start,
                            row_number() OVER (PARTITION BY ds2.user_id ORDER BY ds2.snapshot_date DESC) AS rn_end
                           FROM public.daily_snapshots ds2
                          WHERE (ds2.equity_index IS NOT NULL)) ds
                  GROUP BY ds.user_id) t
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
 SELECT all_time.user_id,
    all_time.year,
    all_time.deposits,
    all_time.withdrawals,
    all_time.equity_ret,
    all_time.vn_ret
   FROM all_time;



