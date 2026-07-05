SET check_function_bodies = false;
ALTER TABLE public.tx_borrow DROP COLUMN is_paid;
DROP VIEW public.equity_rollings;
DROP VIEW public.balance_sheet;
CREATE FUNCTION public.get_accrued_interest()
 RETURNS numeric
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select
    coalesce(
      sum(
        round(
          b.principal * power(
            1 + b.rate / 100.0 / 365.0,
            extract(
              day from current_date::timestamptz - e.created_at
            )
          ) - b.principal,
          0
        )
      ),
      0
    )
  from tx_borrow b
  join tx_entries e
    on e.id = b.tx_id
  where e.user_id = auth.uid()
    and not exists (
      select 1
      from tx_repay r
      where r.borrow_tx = b.tx_id
    );
$function$;
GRANT ALL ON FUNCTION public.get_accrued_interest() TO anon;
GRANT ALL ON FUNCTION public.get_accrued_interest() TO authenticated;
GRANT ALL ON FUNCTION public.get_accrued_interest() TO service_role;
CREATE VIEW public.balance_sheet WITH (security_invoker=true) AS WITH user_legs AS (
         SELECT tl.tx_id,
            tl.asset_id,
            tl.quantity,
            tl.debit,
            tl.credit
           FROM (public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
          WHERE (e.user_id = auth.uid())
        )
 SELECT a.ticker,
    a.name,
    a.asset_class,
    a.logo_url,
    a.currency_code,
    sum(ul.quantity) AS quantity,
    (sum(ul.debit) - sum(ul.credit)) AS cost_basis,
    round(
        CASE
            WHEN (a.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class])) THEN sum((ul.quantity * COALESCE(sp.price, er.rate)))
            ELSE sum(ul.quantity)
        END) AS total_value,
    COALESCE(COALESCE(sp.price, er.rate), (0)::numeric) AS mkt_price,
    COALESCE((sum((ul.quantity * COALESCE(sp.price, er.rate))) - (sum(ul.debit) - sum(ul.credit))), (0)::numeric) AS net_profit
   FROM (((public.assets a
     LEFT JOIN user_legs ul ON ((a.id = ul.asset_id)))
     LEFT JOIN LATERAL ( SELECT (hp.close * (1000)::numeric) AS price
           FROM public.historical_prices hp
          WHERE (hp.asset_id = a.id)
          ORDER BY hp.date DESC
         LIMIT 1) sp ON (true))
     LEFT JOIN LATERAL ( SELECT hfx.rate
           FROM public.historical_fxrate hfx
          WHERE (hfx.currency_code = a.currency_code)
          ORDER BY hfx.date DESC
         LIMIT 1) er ON (true))
  GROUP BY a.ticker, a.name, a.logo_url, a.currency_code, a.asset_class, sp.price, er.rate
 HAVING (abs(sum(ul.quantity)) > (0)::numeric)
  ORDER BY a.asset_class;
CREATE OR REPLACE VIEW public.equity_rollings WITH (security_invoker=true) AS WITH periods AS (
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
     CROSS JOIN LATERAL ( SELECT daily_snapshots.total_equity
           FROM public.daily_snapshots
          WHERE (daily_snapshots.user_id = auth.uid())
          ORDER BY daily_snapshots.snapshot_date DESC
         LIMIT 1) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(p.last3m_date, p.today), 'last_6m', public.get_equity_chart(p.last6m_date, p.today), 'last_1y', public.get_equity_chart(p.last1y_date, p.today), 'all', public.get_equity_chart(p.inception_date, p.today)) AS equitychart
           FROM periods p) ec);
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
