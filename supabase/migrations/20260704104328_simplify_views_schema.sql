DROP VIEW public.last_1y_profit;
DROP VIEW public.performance_data;
DROP VIEW public.monthly_snapshots;
DROP VIEW public.stock_annual_pnl;
DROP VIEW public.yearly_snapshots;
CREATE VIEW public.benchmark_all WITH (security_invoker=true) AS WITH vnindex AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = '^VNINDEX'::text)
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
GRANT ALL ON public.benchmark_all TO anon;
GRANT ALL ON public.benchmark_all TO authenticated;
GRANT ALL ON public.benchmark_all TO service_role;
CREATE VIEW public.benchmark_yearly WITH (security_invoker=true) AS WITH vnindex AS (
         SELECT assets.id
           FROM public.assets
          WHERE (assets.ticker = '^VNINDEX'::text)
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
GRANT ALL ON public.benchmark_yearly TO anon;
GRANT ALL ON public.benchmark_yearly TO authenticated;
GRANT ALL ON public.benchmark_yearly TO service_role;
CREATE VIEW public.cashflow_all WITH (security_invoker=true) AS SELECT sum(GREATEST(intraday_cashflow, (0)::numeric)) AS deposits,
    sum(LEAST(intraday_cashflow, (0)::numeric)) AS withdrawals
   FROM public.daily_snapshots
  WHERE (user_id = auth.uid());
GRANT ALL ON public.cashflow_all TO anon;
GRANT ALL ON public.cashflow_all TO authenticated;
GRANT ALL ON public.cashflow_all TO service_role;
CREATE VIEW public.cashflow_yearly WITH (security_invoker=true) AS SELECT EXTRACT(year FROM snapshot_date) AS year,
    sum(GREATEST(intraday_cashflow, (0)::numeric)) AS deposits,
    sum(LEAST(intraday_cashflow, (0)::numeric)) AS withdrawals
   FROM public.daily_snapshots
  WHERE (user_id = auth.uid())
  GROUP BY (EXTRACT(year FROM snapshot_date))
  ORDER BY (EXTRACT(year FROM snapshot_date));
GRANT ALL ON public.cashflow_yearly TO anon;
GRANT ALL ON public.cashflow_yearly TO authenticated;
GRANT ALL ON public.cashflow_yearly TO service_role;
CREATE VIEW public.pnl_expense_all WITH (security_invoker=true) AS SELECT round(sum(pnl)) AS total_pnl,
    round(avg(pnl)) AS avg_profit,
    (- round(avg(((COALESCE(interest, (0)::numeric) + COALESCE(tax, (0)::numeric)) + COALESCE(fee, (0)::numeric))))) AS avg_expense,
    jsonb_build_object('snapshot_date', jsonb_agg((snapshot_date)::text ORDER BY snapshot_date), 'revenue', jsonb_agg((((COALESCE(pnl, (0)::numeric) + COALESCE(fee, (0)::numeric)) + COALESCE(interest, (0)::numeric)) + COALESCE(tax, (0)::numeric)) ORDER BY snapshot_date), 'fee', jsonb_agg(COALESCE((- fee), (0)::numeric) ORDER BY snapshot_date), 'interest', jsonb_agg(COALESCE((- interest), (0)::numeric) ORDER BY snapshot_date), 'tax', jsonb_agg(COALESCE((- tax), (0)::numeric) ORDER BY snapshot_date)) AS profit_chart
   FROM ( SELECT (date_trunc('year'::text, (ds.snapshot_date)::timestamp with time zone))::date AS snapshot_date,
            sum(ds.intraday_pnl) AS pnl,
            sum(ds.intraday_interest) AS interest,
            sum(ds.intraday_tax) AS tax,
            sum(ds.intraday_fee) AS fee
           FROM public.daily_snapshots ds
          WHERE (ds.user_id = auth.uid())
          GROUP BY ((date_trunc('year'::text, (ds.snapshot_date)::timestamp with time zone))::date)) yearly;
GRANT ALL ON public.pnl_expense_all TO anon;
GRANT ALL ON public.pnl_expense_all TO authenticated;
GRANT ALL ON public.pnl_expense_all TO service_role;
CREATE VIEW public.pnl_expense_last1y WITH (security_invoker=true) AS SELECT round(sum(pnl)) AS total_pnl,
    round(avg(pnl)) AS avg_profit,
    (- round(avg(((COALESCE(interest, (0)::numeric) + COALESCE(tax, (0)::numeric)) + COALESCE(fee, (0)::numeric))))) AS avg_expense,
    jsonb_build_object('snapshot_date', jsonb_agg((snapshot_date)::text ORDER BY snapshot_date), 'revenue', jsonb_agg((((COALESCE(pnl, (0)::numeric) + COALESCE(fee, (0)::numeric)) + COALESCE(interest, (0)::numeric)) + COALESCE(tax, (0)::numeric)) ORDER BY snapshot_date), 'fee', jsonb_agg(COALESCE((- fee), (0)::numeric) ORDER BY snapshot_date), 'interest', jsonb_agg(COALESCE((- interest), (0)::numeric) ORDER BY snapshot_date), 'tax', jsonb_agg(COALESCE((- tax), (0)::numeric) ORDER BY snapshot_date)) AS profit_chart
   FROM ( SELECT (date_trunc('month'::text, (ds.snapshot_date)::timestamp with time zone))::date AS snapshot_date,
            sum(ds.intraday_pnl) AS pnl,
            sum(ds.intraday_interest) AS interest,
            sum(ds.intraday_tax) AS tax,
            sum(ds.intraday_fee) AS fee
           FROM public.daily_snapshots ds
          WHERE (ds.user_id = auth.uid())
          GROUP BY ((date_trunc('month'::text, (ds.snapshot_date)::timestamp with time zone))::date)
          ORDER BY ((date_trunc('month'::text, (ds.snapshot_date)::timestamp with time zone))::date) DESC
         LIMIT 12) ms;
GRANT ALL ON public.pnl_expense_last1y TO anon;
GRANT ALL ON public.pnl_expense_last1y TO authenticated;
GRANT ALL ON public.pnl_expense_last1y TO service_role;
CREATE VIEW public.pnl_expense_yearly WITH (security_invoker=true) AS SELECT (EXTRACT(year FROM snapshot_date))::integer AS year,
    round(sum(pnl)) AS total_pnl,
    round(avg(pnl)) AS avg_profit,
    (- round(avg(((COALESCE(interest, (0)::numeric) + COALESCE(tax, (0)::numeric)) + COALESCE(fee, (0)::numeric))))) AS avg_expense,
    jsonb_build_object('snapshot_date', jsonb_agg((snapshot_date)::text ORDER BY snapshot_date), 'revenue', jsonb_agg((((COALESCE(pnl, (0)::numeric) + COALESCE(fee, (0)::numeric)) + COALESCE(interest, (0)::numeric)) + COALESCE(tax, (0)::numeric)) ORDER BY snapshot_date), 'fee', jsonb_agg(COALESCE((- fee), (0)::numeric) ORDER BY snapshot_date), 'interest', jsonb_agg(COALESCE((- interest), (0)::numeric) ORDER BY snapshot_date), 'tax', jsonb_agg(COALESCE((- tax), (0)::numeric) ORDER BY snapshot_date)) AS profit_chart
   FROM ( SELECT (date_trunc('month'::text, (ds.snapshot_date)::timestamp with time zone))::date AS snapshot_date,
            ds.user_id,
            sum(ds.intraday_pnl) AS pnl,
            sum(ds.intraday_interest) AS interest,
            sum(ds.intraday_tax) AS tax,
            sum(ds.intraday_fee) AS fee
           FROM public.daily_snapshots ds
          GROUP BY ((date_trunc('month'::text, (ds.snapshot_date)::timestamp with time zone))::date), ds.user_id) monthly
  WHERE (user_id = auth.uid())
  GROUP BY ((EXTRACT(year FROM snapshot_date))::integer);
GRANT ALL ON public.pnl_expense_yearly TO anon;
GRANT ALL ON public.pnl_expense_yearly TO authenticated;
GRANT ALL ON public.pnl_expense_yearly TO service_role;
CREATE VIEW public.stock_pnl_yearly WITH (security_invoker=true) AS WITH capital_legs AS (
         SELECT tl.tx_id,
            (tl.credit - tl.debit) AS realized_pnl,
            t.created_at
           FROM ((public.tx_legs tl
             JOIN public.tx_entries t ON ((t.id = tl.tx_id)))
             JOIN public.assets a_1 ON ((tl.asset_id = a_1.id)))
          WHERE ((a_1.ticker = 'CAPITAL'::text) AND (t.user_id = auth.uid()))
        ), stock_legs AS (
         SELECT tl.tx_id,
            tl.asset_id AS stock_id
           FROM ((public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
             JOIN public.assets a_1 ON ((a_1.id = tl.asset_id)))
          WHERE ((a_1.asset_class = 'stock'::public.asset_class) AND (e.user_id = auth.uid()))
        )
 SELECT (EXTRACT(year FROM c.created_at))::integer AS year,
    a.ticker,
    a.name,
    a.logo_url,
    sum(c.realized_pnl) AS total_pnl
   FROM ((capital_legs c
     JOIN stock_legs s ON ((s.tx_id = c.tx_id)))
     JOIN public.assets a ON ((a.id = s.stock_id)))
  GROUP BY a.logo_url, a.name, a.ticker, (EXTRACT(year FROM c.created_at));
CREATE VIEW public.stock_pnl_all WITH (security_invoker=true) AS SELECT ticker,
    name,
    logo_url,
    sum(total_pnl) AS total_pnl
   FROM public.stock_pnl_yearly s
  GROUP BY ticker, name, logo_url
  ORDER BY (sum(total_pnl)) DESC;
GRANT ALL ON public.stock_pnl_all TO anon;
GRANT ALL ON public.stock_pnl_all TO authenticated;
GRANT ALL ON public.stock_pnl_all TO service_role;
GRANT ALL ON public.stock_pnl_yearly TO anon;
GRANT ALL ON public.stock_pnl_yearly TO authenticated;
GRANT ALL ON public.stock_pnl_yearly TO service_role;
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
