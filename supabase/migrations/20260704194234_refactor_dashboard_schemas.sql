SET check_function_bodies = false;
DROP FUNCTION public.process_refresh_queue();
DROP TABLE public.dnse_orders;
DROP VIEW public.equity_return_data;
DROP TRIGGER revalidate_after_news ON public.news_articles;
DROP FUNCTION public.revalidate_news();
ALTER TABLE public.user_settings ADD COLUMN inception_date date DEFAULT '2020-01-01'::date NOT NULL;
CREATE POLICY "Enable users to view their own data only" ON public.user_settings FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE VIEW public.benchmark_rollings WITH (security_invoker=true) AS WITH periods AS (
         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS ytd_date,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS mtd_date,
            ( SELECT us.inception_date
                   FROM public.user_settings us
                  WHERE (us.user_id = auth.uid())) AS inception_date,
            ((CURRENT_DATE - '3 mons'::interval))::date AS last3m_date,
            ((CURRENT_DATE - '6 mons'::interval))::date AS last6m_date,
            ((CURRENT_DATE - '1 year'::interval))::date AS last1y_date
        ), metrics AS (
         SELECT round(public.calculate_twr(periods.ytd_date, periods.today), 3) AS twr_ytd,
            round(public.calculate_twr(periods.inception_date, periods.today), 3) AS twr_all,
            periods.today,
            periods.inception_date
           FROM periods
        )
 SELECT m.twr_ytd,
    m.twr_all,
        CASE
            WHEN ((m.today > m.inception_date) AND (m.inception_date IS NOT NULL)) THEN round((power(((1)::numeric + m.twr_all), (1.0 / (((m.today - m.inception_date))::numeric / 365.25))) - (1)::numeric), 3)
            ELSE NULL::numeric
        END AS cagr,
    rc.returnchart
   FROM (metrics m
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_return_chart(p.last3m_date, p.today), 'last_6m', public.get_return_chart(p.last6m_date, p.today), 'last_1y', public.get_return_chart(p.last1y_date, p.today), 'all', public.get_return_chart(p.inception_date, p.today)) AS returnchart
           FROM periods p) rc);
GRANT ALL ON public.benchmark_rollings TO anon;
GRANT ALL ON public.benchmark_rollings TO authenticated;
GRANT ALL ON public.benchmark_rollings TO service_role;
CREATE VIEW public.equity_rollings WITH (security_invoker=true) AS WITH periods AS (
         SELECT CURRENT_DATE AS today,
            (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date AS ytd_date,
            (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date AS mtd_date,
            ( SELECT us.inception_date
                   FROM public.user_settings us
                  WHERE (us.user_id = auth.uid())) AS inception_date,
            ((CURRENT_DATE - '3 mons'::interval))::date AS last3m_date,
            ((CURRENT_DATE - '6 mons'::interval))::date AS last6m_date,
            ((CURRENT_DATE - '1 year'::interval))::date AS last1y_date
        ), metrics AS (
         SELECT public.calculate_pnl(periods.ytd_date, periods.today) AS pnl_ytd,
            public.calculate_pnl(periods.mtd_date, periods.today) AS pnl_mtd,
            periods.today,
            periods.inception_date
           FROM periods
        )
 SELECT m.pnl_ytd,
    m.pnl_mtd,
    b.total_equity,
    ec.equitychart
   FROM ((metrics m
     CROSS JOIN LATERAL ( SELECT round(sum(bs.total_value)) AS total_equity
           FROM public.balance_sheet bs
          WHERE (bs.asset_class = 'equity'::public.asset_class)) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(p.last3m_date, p.today), 'last_6m', public.get_equity_chart(p.last6m_date, p.today), 'last_1y', public.get_equity_chart(p.last1y_date, p.today), 'all', public.get_equity_chart(p.inception_date, p.today)) AS equitychart
           FROM periods p) ec);
GRANT ALL ON public.equity_rollings TO anon;
GRANT ALL ON public.equity_rollings TO authenticated;
GRANT ALL ON public.equity_rollings TO service_role;
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
