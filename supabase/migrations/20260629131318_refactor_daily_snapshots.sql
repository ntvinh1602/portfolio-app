drop index if exists "public"."daily_snapshots_date_uidx";

drop view if exists "public"."equity_return_data";

drop view if exists "public"."last_1y_profit";

drop view if exists "public"."performance_data";

drop view if exists "public"."yearly_snapshots";

drop view if exists "public"."monthly_snapshots";

drop materialized view if exists "public"."daily_snapshots";

create materialized view "public"."daily_snapshots" as  WITH dates AS (
         SELECT (generate_series((GREATEST('2021-11-09'::date, COALESCE(( SELECT (min(tx_entries.created_at))::date AS min
                   FROM public.tx_entries), '2021-11-09'::date)))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::date AS snapshot_date
        ), business_days AS (
         SELECT dates.snapshot_date
           FROM dates
          WHERE (EXTRACT(isodow FROM dates.snapshot_date) <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), daily_deltas AS (
         SELECT (e.created_at)::date AS activity_date,
            tl.asset_id,
            a.currency_code,
            sum(tl.quantity) AS dq
           FROM ((public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
             JOIN public.assets a ON ((a.id = tl.asset_id)))
          WHERE (a.asset_class <> ALL (ARRAY['equity'::public.asset_class, 'liability'::public.asset_class]))
          GROUP BY ((e.created_at)::date), tl.asset_id, a.currency_code
        ), asset_intervals AS (
         SELECT daily_deltas.asset_id,
            daily_deltas.currency_code,
            sum(daily_deltas.dq) OVER (PARTITION BY daily_deltas.asset_id, daily_deltas.currency_code ORDER BY daily_deltas.activity_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_qty,
            daily_deltas.activity_date AS valid_from,
            COALESCE(lead(daily_deltas.activity_date) OVER (PARTITION BY daily_deltas.asset_id, daily_deltas.currency_code ORDER BY daily_deltas.activity_date), 'infinity'::date) AS valid_to
           FROM daily_deltas
        ), positions AS (
         SELECT (gs.d)::date AS snapshot_date,
            ai.asset_id,
            ai.currency_code,
            ai.cum_qty AS quantity
           FROM (asset_intervals ai
             CROSS JOIN LATERAL generate_series((GREATEST(ai.valid_from, GREATEST('2021-11-09'::date, COALESCE(( SELECT (min(tx_entries.created_at))::date AS min
                   FROM public.tx_entries), '2021-11-09'::date))))::timestamp without time zone, (LEAST((ai.valid_to - 1), CURRENT_DATE))::timestamp without time zone, '1 day'::interval) gs(d))
          WHERE (EXTRACT(isodow FROM gs.d) <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), total_assets_per_day AS (
         SELECT pos.snapshot_date,
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
          GROUP BY pos.snapshot_date
        ), debt_events AS (
         SELECT b.tx_id AS borrow_tx_id,
            b.principal,
            b.rate,
            (e_b.created_at)::date AS borrow_date,
            (e_r.created_at)::date AS repay_date
           FROM (((public.tx_debt b
             JOIN public.tx_entries e_b ON ((e_b.id = b.tx_id)))
             LEFT JOIN public.tx_debt r ON (((r.repay_tx = b.tx_id) AND (r.operation = 'repay'::text))))
             LEFT JOIN public.tx_entries e_r ON ((e_r.id = r.tx_id)))
          WHERE (b.operation = 'borrow'::text)
        ), debt_balances_by_day AS (
         SELECT d.snapshot_date,
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
             CROSS JOIN business_days d)
          WHERE (de.borrow_date <= d.snapshot_date)
        ), total_liabilities_per_day AS (
         SELECT debt_balances_by_day.snapshot_date,
            COALESCE(sum(debt_balances_by_day.balance_at_date), (0)::numeric) AS total_liabilities
           FROM debt_balances_by_day
          GROUP BY debt_balances_by_day.snapshot_date
        ), net_cashflow_per_day AS (
         SELECT (e.created_at)::date AS snapshot_date,
            COALESCE((sum(tl.credit) - sum(tl.debit)), (0)::numeric) AS net_cashflow
           FROM (((public.tx_entries e
             JOIN public.tx_legs tl ON ((tl.tx_id = e.id)))
             JOIN public.assets a ON ((a.id = tl.asset_id)))
             JOIN public.tx_cashflow cf ON ((cf.tx_id = e.id)))
          WHERE ((cf.operation = ANY (ARRAY['deposit'::public.cashflow_ops, 'withdraw'::public.cashflow_ops])) AND (a.asset_class = 'equity'::public.asset_class))
          GROUP BY ((e.created_at)::date)
        ), base AS (
         SELECT d.snapshot_date,
            COALESCE(nc.net_cashflow, (0)::numeric) AS net_cashflow,
            round((COALESCE(tad.total_assets, (0)::numeric) - COALESCE(tld.total_liabilities, (0)::numeric))) AS net_equity
           FROM (((business_days d
             LEFT JOIN total_assets_per_day tad ON ((tad.snapshot_date = d.snapshot_date)))
             LEFT JOIN total_liabilities_per_day tld ON ((tld.snapshot_date = d.snapshot_date)))
             LEFT JOIN net_cashflow_per_day nc ON ((nc.snapshot_date = d.snapshot_date)))
        ), with_returns AS (
         SELECT b.snapshot_date,
            b.net_equity,
            b.net_cashflow,
            round(COALESCE(sum(b.net_cashflow) OVER (ORDER BY b.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::numeric)) AS cumulative_cashflow,
                CASE
                    WHEN (lag(b.net_equity) OVER (ORDER BY b.snapshot_date) IS NULL) THEN (0)::numeric
                    WHEN (lag(b.net_equity) OVER (ORDER BY b.snapshot_date) = (0)::numeric) THEN (0)::numeric
                    ELSE (((b.net_equity - b.net_cashflow) - lag(b.net_equity) OVER (ORDER BY b.snapshot_date)) / NULLIF(lag(b.net_equity) OVER (ORDER BY b.snapshot_date), (0)::numeric))
                END AS daily_return
           FROM base b
        ), with_index AS (
         SELECT with_returns.snapshot_date,
            with_returns.net_equity,
            with_returns.net_cashflow,
            with_returns.cumulative_cashflow,
            with_returns.daily_return,
            round(((exp(sum(ln(GREATEST(abs(COALESCE(((1)::numeric + with_returns.daily_return), (1)::numeric)), 0.000000000001))) OVER (ORDER BY with_returns.snapshot_date)) * (100)::numeric) * (
                CASE
                    WHEN ((count(*) FILTER (WHERE (((1)::numeric + with_returns.daily_return) < (0)::numeric)) OVER (ORDER BY with_returns.snapshot_date) % (2)::bigint) = 1) THEN '-1'::integer
                    ELSE 1
                END)::numeric), 2) AS equity_index
           FROM with_returns
        )
 SELECT snapshot_date,
    net_equity,
    net_cashflow,
    cumulative_cashflow,
    equity_index
   FROM with_index;


create or replace view "public"."monthly_snapshots" with
  (security_invoker = true) as  WITH month_ranges AS (
         SELECT (date_trunc('month'::text, d.d))::date AS month_start,
            LEAST(((date_trunc('month'::text, d.d) + '1 mon -1 days'::interval))::date, CURRENT_DATE) AS month_end
           FROM generate_series('2021-11-01 00:00:00+00'::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) d(d)
        ), monthly_transactions AS (
         SELECT (date_trunc('month'::text, t.created_at))::date AS month,
            (COALESCE(sum(s.fee), (0)::numeric) + COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%fee%'::text)), (0)::numeric)) AS total_fees,
            COALESCE(sum(s.tax), (0)::numeric) AS total_taxes,
            COALESCE(sum(d.interest), (0)::numeric) AS loan_interest,
            COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%interest%'::text)), (0)::numeric) AS margin_interest
           FROM (((public.tx_entries t
             LEFT JOIN public.tx_debt d ON ((d.tx_id = t.id)))
             LEFT JOIN public.tx_stock s ON ((s.tx_id = t.id)))
             LEFT JOIN public.tx_cashflow cf ON ((cf.tx_id = t.id)))
          GROUP BY ((date_trunc('month'::text, t.created_at))::date)
        ), monthly_pnl AS (
         SELECT m_1.month_start,
            m_1.month_end,
            start_s.net_equity AS start_equity,
            end_s.net_equity AS end_equity,
            COALESCE(sum(ds.net_cashflow), (0)::numeric) AS cash_flow,
            ((COALESCE(end_s.net_equity, (0)::numeric) - COALESCE(start_s.net_equity, (0)::numeric)) - COALESCE(sum(ds.net_cashflow), (0)::numeric)) AS pnl
           FROM (((month_ranges m_1
             LEFT JOIN public.daily_snapshots ds ON (((ds.snapshot_date >= m_1.month_start) AND (ds.snapshot_date <= m_1.month_end))))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE (s.snapshot_date < m_1.month_start)
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) start_s ON (true))
             LEFT JOIN LATERAL ( SELECT s.net_equity
                   FROM public.daily_snapshots s
                  WHERE (s.snapshot_date <= m_1.month_end)
                  ORDER BY s.snapshot_date DESC
                 LIMIT 1) end_s ON (true))
          GROUP BY m_1.month_start, m_1.month_end, start_s.net_equity, end_s.net_equity
        )
 SELECT m.month_start AS snapshot_date,
    mp.pnl,
    (COALESCE(mt.loan_interest, (0)::numeric) + COALESCE(mt.margin_interest, (0)::numeric)) AS interest,
    COALESCE(mt.total_taxes, (0)::numeric) AS tax,
    COALESCE(mt.total_fees, (0)::numeric) AS fee
   FROM ((month_ranges m
     LEFT JOIN monthly_pnl mp ON ((mp.month_start = m.month_start)))
     LEFT JOIN monthly_transactions mt ON ((mt.month = m.month_start)));


create or replace view "public"."yearly_snapshots" with
  (security_invoker = true) as  WITH vn_asset AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = '^VNINDEX'::text)
        ), annual_cashflow AS (
         SELECT (EXTRACT(year FROM daily_snapshots.snapshot_date))::integer AS year,
            sum(GREATEST(daily_snapshots.net_cashflow, (0)::numeric)) AS deposits,
            sum(LEAST(daily_snapshots.net_cashflow, (0)::numeric)) AS withdrawals
           FROM public.daily_snapshots
          GROUP BY ((EXTRACT(year FROM daily_snapshots.snapshot_date))::integer)
        ), equity_ranked AS (
         SELECT (EXTRACT(year FROM daily_snapshots.snapshot_date))::integer AS year,
            daily_snapshots.equity_index,
            row_number() OVER (PARTITION BY (EXTRACT(year FROM daily_snapshots.snapshot_date)) ORDER BY daily_snapshots.snapshot_date) AS rn_start,
            row_number() OVER (PARTITION BY (EXTRACT(year FROM daily_snapshots.snapshot_date)) ORDER BY daily_snapshots.snapshot_date DESC) AS rn_end
           FROM public.daily_snapshots
          WHERE (daily_snapshots.equity_index IS NOT NULL)
        ), equity_returns AS (
         SELECT t.year,
            round(
                CASE
                    WHEN (t.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE (((t.last_value - t.first_value) / t.first_value) * (100)::numeric)
                END, 2) AS equity_ret
           FROM ( SELECT equity_ranked.year,
                    max(equity_ranked.equity_index) FILTER (WHERE (equity_ranked.rn_start = 1)) AS first_value,
                    max(equity_ranked.equity_index) FILTER (WHERE (equity_ranked.rn_end = 1)) AS last_value
                   FROM equity_ranked
                  GROUP BY equity_ranked.year) t
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
                    ELSE (((t.last_value - t.first_value) / t.first_value) * (100)::numeric)
                END, 2) AS vn_ret
           FROM ( SELECT vn_ranked.year,
                    max(vn_ranked.close) FILTER (WHERE (vn_ranked.rn_start = 1)) AS first_value,
                    max(vn_ranked.close) FILTER (WHERE (vn_ranked.rn_end = 1)) AS last_value
                   FROM vn_ranked
                  GROUP BY vn_ranked.year) t
        ), yearly_combined AS (
         SELECT COALESCE(e.year, v.year) AS year,
            e.equity_ret,
            v.vn_ret
           FROM (equity_returns e
             FULL JOIN vn_returns v USING (year))
        ), all_time_cashflow AS (
         SELECT sum(GREATEST(daily_snapshots.net_cashflow, (0)::numeric)) AS deposits,
            sum(LEAST(daily_snapshots.net_cashflow, (0)::numeric)) AS withdrawals
           FROM public.daily_snapshots
        ), all_time_equity AS (
         SELECT round(
                CASE
                    WHEN (t2.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE (((t2.last_value - t2.first_value) / t2.first_value) * (100)::numeric)
                END, 2) AS equity_ret
           FROM ( SELECT max(t.equity_index) FILTER (WHERE (t.rn_start = 1)) AS first_value,
                    max(t.equity_index) FILTER (WHERE (t.rn_end = 1)) AS last_value
                   FROM ( SELECT daily_snapshots.equity_index,
                            row_number() OVER (ORDER BY daily_snapshots.snapshot_date) AS rn_start,
                            row_number() OVER (ORDER BY daily_snapshots.snapshot_date DESC) AS rn_end
                           FROM public.daily_snapshots
                          WHERE (daily_snapshots.equity_index IS NOT NULL)) t) t2
        ), all_time_vn AS (
         SELECT round(
                CASE
                    WHEN (t2.first_value = (0)::numeric) THEN NULL::numeric
                    ELSE (((t2.last_value - t2.first_value) / t2.first_value) * (100)::numeric)
                END, 2) AS vn_ret
           FROM ( SELECT max(t.close) FILTER (WHERE (t.rn_start = 1)) AS first_value,
                    max(t.close) FILTER (WHERE (t.rn_end = 1)) AS last_value
                   FROM ( SELECT hp.close,
                            row_number() OVER (ORDER BY hp.date) AS rn_start,
                            row_number() OVER (ORDER BY hp.date DESC) AS rn_end
                           FROM (public.historical_prices hp
                             CROSS JOIN vn_asset va)
                          WHERE (hp.asset_id = va.id)) t) t2
        ), all_time AS (
         SELECT 9999 AS year,
            atc.deposits,
            atc.withdrawals,
            ate.equity_ret,
            atv.vn_ret
           FROM ((all_time_cashflow atc
             CROSS JOIN all_time_equity ate)
             CROSS JOIN all_time_vn atv)
        )
 SELECT yc.year,
    ac.deposits,
    ac.withdrawals,
    yc.equity_ret,
    yc.vn_ret
   FROM (yearly_combined yc
     LEFT JOIN annual_cashflow ac USING (year))
UNION ALL
 SELECT all_time.year,
    all_time.deposits,
    all_time.withdrawals,
    all_time.equity_ret,
    all_time.vn_ret
   FROM all_time;


create or replace view "public"."equity_return_data" with
  (security_invoker = true) as  WITH periods AS (
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


create or replace view "public"."last_1y_profit" with
  (security_invoker = true) as  SELECT round(sum(pnl)) AS total_pnl,
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


create or replace view "public"."performance_data" with
  (security_invoker = true) as  WITH stock_base AS (
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



