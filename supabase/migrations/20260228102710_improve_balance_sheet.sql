drop materialized view dashboard_data;

drop view if exists public.balance_sheet;
drop view if exists public.balance_sheet;

CREATE OR REPLACE VIEW public.balance_sheet WITH (security_invoker='on') AS
 WITH stock AS (
         SELECT a.ticker,
            (sum(tl.debit) - sum(tl.credit)) AS cost_basis,
            sum(((tl.quantity * COALESCE(sp.price, (1)::numeric)) * COALESCE(er.rate, (1)::numeric))) AS market_value
           FROM (((assets a
             JOIN public.tx_legs tl ON ((a.id = tl.asset_id)))
             LEFT JOIN LATERAL ( SELECT hp.close AS price
                  FROM historical_prices hp
                  WHERE (hp.asset_id = a.id)
                  ORDER BY hp.date DESC
                 LIMIT 1) sp ON (true))
             LEFT JOIN LATERAL ( SELECT hfx.rate
                   FROM historical_fxrate hfx
                  WHERE (hfx.currency_code = a.currency_code)
                  ORDER BY hfx.date DESC
                 LIMIT 1) er ON (true))
          WHERE (a.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class]))
          GROUP BY a.ticker
        ), debt_interest AS (
          select sum(interest) from outstanding_debts
        ), pnl AS (
         SELECT ((sum(s.market_value) - sum(s.cost_basis)) - (SELECT * FROM debt_interest))
           FROM stock s
        ), margin AS (
         SELECT GREATEST((- sum(tl.quantity)), (0)::numeric)
         FROM (public.tx_legs tl
          JOIN public.assets a ON ((tl.asset_id = a.id)))
         WHERE (a.ticker = 'FX.VND'::text)
        ), asset_quantity AS (
         SELECT a.ticker,
            a.name,
            a.asset_class,
                CASE
                    WHEN (a.ticker = 'INTERESTS'::text) THEN (SELECT * FROM debt_interest)
                    WHEN (a.ticker = 'UNREALIZED'::text) THEN (SELECT * FROM pnl)
                    WHEN (a.ticker = 'MARGIN'::text) THEN (SELECT * FROM margin)
                    ELSE GREATEST(sum(tl.quantity), (0)::numeric)
                END AS quantity
           FROM (public.assets a
             LEFT JOIN public.tx_legs tl ON ((tl.asset_id = a.id)))
          WHERE (a.asset_class <> 'index'::public.asset_class)
          GROUP BY a.id, a.ticker, a.asset_class
        )
 SELECT aq.ticker,
    aq.name,
    aq.asset_class,
    aq.quantity,
        CASE
            WHEN (aq.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class])) THEN s.market_value
            ELSE aq.quantity
        END AS total_value
   FROM (asset_quantity aq
     LEFT JOIN stock s ON ((aq.ticker = s.ticker)))
  WHERE ((aq.quantity > (0)::numeric) OR (aq.asset_class <> 'stock'::public.asset_class))
  ORDER BY aq.asset_class;

CREATE MATERIALIZED VIEW public.dashboard_data AS
 WITH periods AS (
         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS ytd_date,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS mtd_date,
            '2000-01-01'::date AS inception_date,
            ((CURRENT_DATE - '3 mons'::interval))::date AS last3m_date,
            ((CURRENT_DATE - '6 mons'::interval))::date AS last6m_date,
            ((CURRENT_DATE - '1 year'::interval))::date AS last1y_date
        ), pnl AS (
         SELECT public.calculate_pnl(periods.ytd_date, periods.today) AS pnl_ytd,
            public.calculate_pnl(periods.mtd_date, periods.today) AS pnl_mtd
           FROM periods
        ), twr AS (
         SELECT public.calculate_twr(periods.ytd_date, periods.today) AS twr_ytd,
            public.calculate_twr(periods.inception_date, periods.today) AS twr_all
           FROM periods
        ), equity_chart AS (
         SELECT public.get_equity_chart(periods.last3m_date, periods.today, 150) AS equitychart_3m,
            public.get_equity_chart(periods.last6m_date, periods.today, 150) AS equitychart_6m,
            public.get_equity_chart(periods.last1y_date, periods.today, 150) AS equitychart_1y,
            public.get_equity_chart(periods.inception_date, periods.today, 150) AS equitychart_all
           FROM periods
        ), return_chart AS (
         SELECT public.get_return_chart(periods.last3m_date, periods.today, 150) AS returnchart_3m,
            public.get_return_chart(periods.last6m_date, periods.today, 150) AS returnchart_6m,
            public.get_return_chart(periods.last1y_date, periods.today, 150) AS returnchart_1y,
            public.get_return_chart(periods.inception_date, periods.today, 150) AS returnchart_all
           FROM periods
        ), balance AS (
         SELECT sum(bs.total_value) FILTER (WHERE (bs.asset_class = 'equity'::public.asset_class)) AS total_equity,
            sum(bs.total_value) FILTER (WHERE (bs.asset_class = 'liability'::public.asset_class)) AS total_liabilities,
            sum(bs.total_value) FILTER (WHERE (bs.asset_class = 'fund'::public.asset_class)) AS fund,
            sum(bs.total_value) FILTER (WHERE (bs.asset_class = 'stock'::public.asset_class)) AS stock,
            sum(bs.total_value) FILTER (WHERE (bs.asset_class = 'cash'::public.asset_class)) AS cash,
            max(bs.total_value) FILTER (WHERE (bs.ticker = 'MARGIN'::text)) AS margin
           FROM public.balance_sheet bs
        ), debt AS (
         SELECT sum((od.principal + od.interest)) AS debts
           FROM public.outstanding_debts od
        ), monthly AS (
         SELECT sum(last_12.pnl) AS total_pnl,
            avg(last_12.pnl) AS avg_profit,
            (- avg(((last_12.interest + last_12.tax) + last_12.fee))) AS avg_expense,
            ( SELECT jsonb_agg(jsonb_build_object('revenue', (((COALESCE(last_12.pnl, (0)::numeric) + COALESCE(last_12.fee, (0)::numeric)) + COALESCE(last_12.interest, (0)::numeric)) + COALESCE(last_12.tax, (0)::numeric)), 'fee', COALESCE((- last_12.fee), (0)::numeric), 'interest', COALESCE((- last_12.interest), (0)::numeric), 'tax', COALESCE((- last_12.tax), (0)::numeric), 'snapshot_date', (last_12.snapshot_date)::text) ORDER BY last_12.snapshot_date) AS jsonb_agg) AS profit_chart
           FROM ( SELECT ms.snapshot_date,
                    ms.pnl,
                    ms.interest,
                    ms.tax,
                    ms.fee
                   FROM public.monthly_snapshots ms
                  ORDER BY ms.snapshot_date DESC
                 LIMIT 12) last_12
        ), stock_positions AS (
         SELECT jsonb_agg(jsonb_build_object('ticker', sh.ticker, 'name', sh.name, 'logo_url', sh.logo_url, 'quantity', sh.quantity, 'cost_basis', sh.cost_basis, 'price', sh.price) ORDER BY sh.ticker) AS stock_list
           FROM public.stock_holdings sh
        )
 SELECT pnl.pnl_ytd,
    pnl.pnl_mtd,
    twr.twr_ytd,
    twr.twr_all,
    balance.total_equity,
    balance.total_liabilities,
    balance.fund,
    balance.stock,
    balance.cash,
    balance.margin,
    debt.debts,
    monthly.total_pnl,
    monthly.avg_profit,
    monthly.avg_expense,
    monthly.profit_chart,
    stock_positions.stock_list,
    equity_chart.equitychart_3m,
    equity_chart.equitychart_6m,
    equity_chart.equitychart_1y,
    equity_chart.equitychart_all,
    return_chart.returnchart_3m,
    return_chart.returnchart_6m,
    return_chart.returnchart_1y,
    return_chart.returnchart_all
   FROM (((((((pnl
     CROSS JOIN twr)
     CROSS JOIN balance)
     CROSS JOIN debt)
     CROSS JOIN monthly)
     CROSS JOIN stock_positions)
     CROSS JOIN equity_chart)
     CROSS JOIN return_chart);

revoke select on public.dashboard_data from public, anon, authenticated;