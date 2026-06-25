drop materialized view if exists "public"."dashboard_data";

drop view if exists "public"."balance_sheet";

set check_function_bodies = off;

create or replace view "public"."balance_sheet" WITH ("security_invoker"='on') as  WITH stock AS (
         SELECT a.ticker,
                CASE
                    WHEN (a.asset_class = 'stock'::public.asset_class) THEN sp.price
                    ELSE er.rate
                END AS mkt_price,
            (sum(tl.debit) - sum(tl.credit)) AS cost_basis,
            sum(((tl.quantity * COALESCE(sp.price, (1)::numeric)) * COALESCE(er.rate, (1)::numeric))) AS market_value,
            (sum(((tl.quantity * COALESCE(sp.price, (1)::numeric)) * COALESCE(er.rate, (1)::numeric))) - (sum(tl.debit) - sum(tl.credit))) AS net_profit
           FROM (((public.assets a
             JOIN public.tx_legs tl ON ((a.id = tl.asset_id)))
             LEFT JOIN LATERAL ( SELECT hp.close AS price
                   FROM public.historical_prices hp
                  WHERE (hp.asset_id = a.id)
                  ORDER BY hp.date DESC
                 LIMIT 1) sp ON (true))
             LEFT JOIN LATERAL ( SELECT hfx.rate
                   FROM public.historical_fxrate hfx
                  WHERE (hfx.currency_code = a.currency_code)
                  ORDER BY hfx.date DESC
                 LIMIT 1) er ON (true))
          WHERE (a.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class]))
          GROUP BY a.ticker, a.logo_url, a.currency_code, a.asset_class, sp.price, er.rate
        ), debt_interest AS (
         SELECT sum(outstanding_debts.interest) AS sum
           FROM public.outstanding_debts
        ), pnl AS (
         SELECT ((sum(s_1.market_value) - sum(s_1.cost_basis)) - ( SELECT debt_interest.sum
                   FROM debt_interest)) AS "?column?"
           FROM stock s_1
        ), margin AS (
         SELECT GREATEST((- sum(tl.quantity)), (0)::numeric) AS "greatest"
           FROM (public.tx_legs tl
             JOIN public.assets a ON ((tl.asset_id = a.id)))
          WHERE (a.ticker = 'FX.VND'::text)
        ), asset_quantity AS (
         SELECT a.ticker,
            a.name,
            a.asset_class,
            a.logo_url,
            a.currency_code,
                CASE
                    WHEN (a.ticker = 'INTERESTS'::text) THEN ( SELECT debt_interest.sum
                       FROM debt_interest)
                    WHEN (a.ticker = 'UNREALIZED'::text) THEN ( SELECT pnl."?column?"
                       FROM pnl)
                    WHEN (a.ticker = 'MARGIN'::text) THEN ( SELECT margin."greatest"
                       FROM margin)
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
    aq.logo_url,
    aq.currency_code,
    aq.quantity,
        CASE
            WHEN (aq.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class])) THEN s.market_value
            ELSE aq.quantity
        END AS total_value,
    s.mkt_price,
    s.net_profit
   FROM (asset_quantity aq
     LEFT JOIN stock s ON ((aq.ticker = s.ticker)))
  WHERE ((aq.quantity > (0)::numeric) OR (aq.asset_class <> 'stock'::public.asset_class));


create materialized view "public"."dashboard_data" as  WITH periods AS (
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
            public.calculate_twr(periods.inception_date, periods.today) AS twr_all,
                CASE
                    WHEN (periods.today > periods.inception_date) THEN (power(((1)::numeric + public.calculate_twr(periods.inception_date, periods.today)), (1.0 / (((periods.today - ( SELECT min(monthly_snapshots.snapshot_date) AS min
                       FROM public.monthly_snapshots)))::numeric / 365.25))) - (1)::numeric)
                    ELSE NULL::numeric
                END AS cagr
           FROM periods
        ), equity_chart AS (
         SELECT jsonb_build_object('last_3m', public.get_equity_chart(periods.last3m_date, periods.today, 150), 'last_6m', public.get_equity_chart(periods.last6m_date, periods.today, 150), 'last_1y', public.get_equity_chart(periods.last1y_date, periods.today, 150), 'all', public.get_equity_chart(periods.inception_date, periods.today, 150)) AS equitychart
           FROM periods
        ), return_chart AS (
         SELECT jsonb_build_object('last_3m', public.get_return_chart(periods.last3m_date, periods.today, 150), 'last_6m', public.get_return_chart(periods.last6m_date, periods.today, 150), 'last_1y', public.get_return_chart(periods.last1y_date, periods.today, 150), 'all', public.get_return_chart(periods.inception_date, periods.today, 150)) AS returnchart
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
    twr.cagr,
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
    equity_chart.equitychart,
    return_chart.returnchart
   FROM (((((((pnl
     CROSS JOIN twr)
     CROSS JOIN balance)
     CROSS JOIN debt)
     CROSS JOIN monthly)
     CROSS JOIN stock_positions)
     CROSS JOIN equity_chart)
     CROSS JOIN return_chart);


CREATE OR REPLACE FUNCTION public.process_refresh_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  pending_count integer;
  app_secret text;
  app_url text;
  response jsonb;
begin
  -- Check if anything is queued
  select count(*)
  into pending_count
  from public.refresh_queue;

  if pending_count = 0 then
    return;
  end if;

  -- Clear queue first (debounce behavior)
  delete from public.refresh_queue;

  -- Refresh materialized views
  refresh materialized view concurrently public.daily_snapshots;
  refresh materialized view public.dashboard_data;
  refresh materialized view public.recaps_data;

  -- Get secrets from Vault
  select decrypted_secret
  into app_secret
  from vault.decrypted_secrets
  where name = 'APP_SECRET';

  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'APP_URL';

  if app_secret is null then
    raise exception 'APP_SECRET not found in vault';
  end if;

  if app_url is null then
    raise exception 'APP_URL not found in vault';
  end if;

  -- Call app update cache endpoint
  select net.http_post(
    url := app_url || '/api/update',
    headers := jsonb_build_object(
      'x-update-secret', app_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'tags', jsonb_build_array('analytics')
    )
  )
  into response;
end;$function$
;

CREATE OR REPLACE FUNCTION public.revalidate_news()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  app_secret text;
  app_url text;
  response jsonb;
begin
  -- Get app secret from Vault
  select decrypted_secret
  into app_secret
  from vault.decrypted_secrets
  where name = 'APP_SECRET';

  -- Get app url from Vault
  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'APP_URL';

  if app_secret is null then
    raise exception 'APP_SECRET not found in vault';
  end if;

  if app_url is null then
    raise exception 'APP_URL not found in vault';
  end if;

  -- Call app update cache endpoint
  select net.http_post(
    url := app_url || '/api/update',
    headers := jsonb_build_object(
      'x-update-secret', app_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'tags', jsonb_build_array('news')
    )
  )
  into response;

  return null; -- AFTER trigger does not modify row
end;$function$
;


