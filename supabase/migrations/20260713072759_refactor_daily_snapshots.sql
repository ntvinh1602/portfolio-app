SET check_function_bodies = false;
DROP VIEW public.benchmark_all;
DROP VIEW public.benchmark_yearly;
DROP VIEW public.cashflow_all;
DROP VIEW public.cashflow_yearly;
DROP VIEW public.equity_rollings;
DROP VIEW public.pnl_expense_all;
DROP VIEW public.pnl_expense_last1y;
DROP VIEW public.pnl_expense_yearly;
drop trigger if exists after_new_fxrate  on public.historical_fxrate;
drop trigger if exists after_new_prices  on public.historical_prices;
drop trigger if exists after_new_tx_legs on public.tx_legs;
DROP MATERIALIZED VIEW if exists public.daily_snapshots;
DROP FUNCTION public.refresh_daily_snapshots();
CREATE FUNCTION public.recompute_daily_snapshots(p_user_id uuid DEFAULT NULL::uuid, p_from_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_from date := coalesce(p_from_date, '-infinity'::date);
begin
    -- Remove the slice we are about to rebuild (rows before v_from are the
    -- cumulative seed and are left untouched).
    delete from public.daily_snapshots
    where snapshot_date >= v_from
      and (p_user_id is null or user_id = p_user_id);

    insert into public.daily_snapshots (
        snapshot_date, user_id, total_equity, intraday_cashflow,
        intraday_fee, intraday_tax, intraday_interest,
        total_cashflow, intraday_pnl, intraday_return
    )
    with users as (
        select tx_entries.user_id,
               (min(tx_entries.created_at))::date as start_date
        from public.tx_entries
        where tx_entries.user_id is not null
          and (p_user_id is null or tx_entries.user_id = p_user_id)
        group by tx_entries.user_id
    ),
    user_days as (
        select u.user_id,
               (gs.d)::date as snapshot_date
        from users u
        cross join lateral generate_series(
                 (greatest(u.start_date, v_from))::timestamptz,
                 (current_date)::timestamptz,
                 '1 day'::interval) gs(d)
        where extract(isodow from gs.d) <> all (array[6::numeric, 7::numeric])
    ),
    daily_deltas as (
        select e.user_id,
               (e.created_at)::date as activity_date,
               tl.asset_id,
               a.currency_code,
               sum(tl.quantity) as dq
        from public.tx_legs tl
        join public.tx_entries e on e.id = tl.tx_id
        join public.assets a     on a.id = tl.asset_id
        where a.asset_class <> all (array['equity'::public.asset_class,
                                          'liability'::public.asset_class])
          and (p_user_id is null or e.user_id = p_user_id)
        group by e.user_id, (e.created_at)::date, tl.asset_id, a.currency_code
    ),
    asset_intervals as (
        select dd.user_id,
               dd.asset_id,
               dd.currency_code,
               sum(dd.dq) over (partition by dd.user_id, dd.asset_id, dd.currency_code
                                order by dd.activity_date
                                rows between unbounded preceding and current row) as cum_qty,
               dd.activity_date as valid_from,
               coalesce(lead(dd.activity_date) over (partition by dd.user_id, dd.asset_id, dd.currency_code
                                                     order by dd.activity_date),
                        'infinity'::date) as valid_to
        from daily_deltas dd
    ),
    positions as (
        -- generate_series clipped to v_from forward: this is the main saving,
        -- the expensive per-day price/fx lookups run only for days >= v_from.
        select (gs.d)::date as snapshot_date,
               ai.user_id,
               ai.asset_id,
               ai.currency_code,
               ai.cum_qty as quantity
        from asset_intervals ai
        cross join lateral generate_series(
                 (greatest(ai.valid_from, v_from))::timestamp,
                 (least((ai.valid_to - 1), current_date))::timestamp,
                 '1 day'::interval) gs(d)
        where extract(isodow from gs.d) <> all (array[6::numeric, 7::numeric])
    ),
    total_assets_per_day as (
        select pos.user_id,
               pos.snapshot_date,
               coalesce(sum(pos.quantity * coalesce(pr.price, 1::numeric)
                                          * coalesce(fx.rate, 1::numeric)), 0::numeric) as total_assets
        from positions pos
        left join lateral (
            select (hp.close * 1000::numeric) as price
            from public.historical_prices hp
            where hp.asset_id = pos.asset_id and hp.date <= pos.snapshot_date
            order by hp.date desc
            limit 1) pr on true
        left join lateral (
            select hf.rate
            from public.historical_fxrate hf
            where hf.currency_code = pos.currency_code and hf.date <= pos.snapshot_date
            order by hf.date desc
            limit 1) fx on true
        group by pos.user_id, pos.snapshot_date
    ),
    debt_events as (
        select e_b.user_id,
               b_1.tx_id as borrow_tx_id,
               b_1.principal,
               b_1.rate,
               (e_b.created_at)::date as borrow_date,
               (e_r.created_at)::date as repay_date
        from public.tx_borrow b_1
        join public.tx_entries e_b on e_b.id = b_1.tx_id
        left join public.tx_repay r on r.borrow_tx = b_1.tx_id
        left join public.tx_entries e_r on e_r.id = r.tx_id
        where (p_user_id is null or e_b.user_id = p_user_id)
    ),
    debt_balances_by_day as (
        select d.snapshot_date,
               de.user_id,
               de.borrow_tx_id,
               de.principal,
               de.rate,
               de.borrow_date,
               de.repay_date,
               case
                 when de.repay_date is not null and de.repay_date <= d.snapshot_date then 0::numeric
                 else de.principal * power(1::numeric + (de.rate / 100.0) / 365.0,
                                           (greatest(d.snapshot_date - de.borrow_date, 0))::numeric)
               end as balance_at_date
        from debt_events de
        join user_days d on d.user_id = de.user_id
        where de.borrow_date <= d.snapshot_date
    ),
    total_liabilities_per_day as (
        select debt_balances_by_day.user_id,
               debt_balances_by_day.snapshot_date,
               coalesce(sum(debt_balances_by_day.balance_at_date), 0::numeric) as total_liabilities
        from debt_balances_by_day
        group by debt_balances_by_day.user_id, debt_balances_by_day.snapshot_date
    ),
    cashflow_per_day as (
        select e.user_id,
               (e.created_at)::date as snapshot_date,
               coalesce(sum(tl.credit) - sum(tl.debit), 0::numeric) as intraday_cashflow
        from public.tx_entries e
        join public.tx_legs tl     on tl.tx_id = e.id
        join public.assets a       on a.id = tl.asset_id
        join public.tx_cashflow cf on cf.tx_id = e.id
        where cf.operation = any (array['deposit'::public.cashflow_ops, 'withdraw'::public.cashflow_ops])
          and a.asset_class = 'equity'::public.asset_class
          and (p_user_id is null or e.user_id = p_user_id)
        group by e.user_id, (e.created_at)::date
    ),
    tax_fee_per_day as (
        select e.user_id,
               (e.created_at)::date as snapshot_date,
               (coalesce(sum(s.fee), 0::numeric)
                 + coalesce(sum(cf.net_proceed) filter (where e.memo = 'Operational fees'), 0::numeric)) as total_fees,
               coalesce(sum(s.tax), 0::numeric) as total_taxes,
               coalesce(sum(r.interest), 0::numeric) as loan_interest,
               coalesce(sum(cf.net_proceed) filter (where e.memo = any (array['Margin interest','Cash advance interest'])), 0::numeric) as margin_interest
        from public.tx_entries e
        left join public.tx_repay r    on r.tx_id = e.id
        left join public.tx_stock s    on s.tx_id = e.id
        left join public.tx_cashflow cf on cf.tx_id = e.id
        where (p_user_id is null or e.user_id = p_user_id)
        group by e.user_id, (e.created_at)::date
    ),
    base as (
        select d.snapshot_date,
               d.user_id,
               coalesce(nc.intraday_cashflow, 0::numeric) as intraday_cashflow,
               round(coalesce(tad.total_assets, 0::numeric) - coalesce(tld.total_liabilities, 0::numeric)) as total_equity,
               coalesce(tf.total_fees, 0::numeric) as intraday_fee,
               coalesce(tf.total_taxes, 0::numeric) as intraday_tax,
               coalesce(tf.loan_interest + tf.margin_interest, 0::numeric) as intraday_interest
        from user_days d
        left join total_assets_per_day      tad on tad.snapshot_date = d.snapshot_date and tad.user_id = d.user_id
        left join total_liabilities_per_day tld on tld.snapshot_date = d.snapshot_date and tld.user_id = d.user_id
        left join cashflow_per_day          nc  on nc.snapshot_date  = d.snapshot_date and nc.user_id  = d.user_id
        left join tax_fee_per_day           tf  on tf.snapshot_date  = d.snapshot_date and tf.user_id  = d.user_id
    ),
    seeds as (
        -- last stored row strictly before v_from = cumulative seed per user
        select distinct on (user_id)
               user_id,
               total_cashflow as seed_cashflow,
               total_equity   as seed_equity
        from public.daily_snapshots
        where snapshot_date < v_from
          and (p_user_id is null or user_id = p_user_id)
        order by user_id, snapshot_date desc
    )
    select
        b.snapshot_date,
        b.user_id,
        b.total_equity,
        b.intraday_cashflow,
        b.intraday_fee,
        b.intraday_tax,
        b.intraday_interest,
        round(coalesce(s.seed_cashflow, 0::numeric)
              + sum(b.intraday_cashflow) over w_running) as total_cashflow,
        case
            when coalesce(lag(b.total_equity) over w_ord, s.seed_equity) is null then 0::numeric
            when coalesce(lag(b.total_equity) over w_ord, s.seed_equity) = 0::numeric then 0::numeric
            else (b.total_equity - b.intraday_cashflow) - coalesce(lag(b.total_equity) over w_ord, s.seed_equity)
        end as intraday_pnl,
        case
            when coalesce(lag(b.total_equity) over w_ord, s.seed_equity) is null then 0::numeric
            when coalesce(lag(b.total_equity) over w_ord, s.seed_equity) = 0::numeric then 0::numeric
            else ((b.total_equity - b.intraday_cashflow) - coalesce(lag(b.total_equity) over w_ord, s.seed_equity))
                 / nullif(coalesce(lag(b.total_equity) over w_ord, s.seed_equity), 0::numeric)
        end as intraday_return
    from base b
    left join seeds s on s.user_id = b.user_id
    window
        w_ord     as (partition by b.user_id order by b.snapshot_date),
        w_running as (partition by b.user_id order by b.snapshot_date
                      rows between unbounded preceding and current row);
end;
$function$;
GRANT ALL ON FUNCTION public.recompute_daily_snapshots(uuid, date) TO anon;
GRANT ALL ON FUNCTION public.recompute_daily_snapshots(uuid, date) TO authenticated;
GRANT ALL ON FUNCTION public.recompute_daily_snapshots(uuid, date) TO service_role;
CREATE FUNCTION public.trg_snapshots_fxrate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
    if tg_op = 'INSERT' then
        for r in
            select e.user_id, min(c.date) as d
            from (select currency_code, date from new_rows) c
            join public.assets a      on a.currency_code = c.currency_code
            join public.tx_legs tl    on tl.asset_id = a.id
            join public.tx_entries e  on e.id = tl.tx_id
            group by e.user_id
        loop
            perform public.recompute_daily_snapshots(r.user_id, r.d);
        end loop;
    else  -- UPDATE
        for r in
            with changed as (
                select currency_code, date from new_rows
                union
                select currency_code, date from old_rows
            )
            select e.user_id, min(c.date) as d
            from changed c
            join public.assets a      on a.currency_code = c.currency_code
            join public.tx_legs tl    on tl.asset_id = a.id
            join public.tx_entries e  on e.id = tl.tx_id
            group by e.user_id
        loop
            perform public.recompute_daily_snapshots(r.user_id, r.d);
        end loop;
    end if;
    return null;
end;
$function$;
GRANT ALL ON FUNCTION public.trg_snapshots_fxrate() TO anon;
GRANT ALL ON FUNCTION public.trg_snapshots_fxrate() TO authenticated;
GRANT ALL ON FUNCTION public.trg_snapshots_fxrate() TO service_role;
CREATE FUNCTION public.trg_snapshots_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
    if tg_op = 'INSERT' then
        for r in
            select e.user_id, min(c.date) as d
            from (select asset_id, date from new_rows) c
            join public.tx_legs tl    on tl.asset_id = c.asset_id
            join public.tx_entries e  on e.id = tl.tx_id
            group by e.user_id
        loop
            perform public.recompute_daily_snapshots(r.user_id, r.d);
        end loop;
    else  -- UPDATE: consider both the new and the old date/asset
        for r in
            with changed as (
                select asset_id, date from new_rows
                union
                select asset_id, date from old_rows
            )
            select e.user_id, min(c.date) as d
            from changed c
            join public.tx_legs tl    on tl.asset_id = c.asset_id
            join public.tx_entries e  on e.id = tl.tx_id
            group by e.user_id
        loop
            perform public.recompute_daily_snapshots(r.user_id, r.d);
        end loop;
    end if;
    return null;
end;
$function$;
GRANT ALL ON FUNCTION public.trg_snapshots_prices() TO anon;
GRANT ALL ON FUNCTION public.trg_snapshots_prices() TO authenticated;
GRANT ALL ON FUNCTION public.trg_snapshots_prices() TO service_role;
CREATE FUNCTION public.trg_snapshots_tx_legs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
    for r in
        select e.user_id, min((e.created_at)::date) as d
        from new_rows nl
        join public.tx_entries e on e.id = nl.tx_id
        group by e.user_id
    loop
        perform public.recompute_daily_snapshots(r.user_id, r.d);
    end loop;
    return null;
end;
$function$;
GRANT ALL ON FUNCTION public.trg_snapshots_tx_legs() TO anon;
GRANT ALL ON FUNCTION public.trg_snapshots_tx_legs() TO authenticated;
GRANT ALL ON FUNCTION public.trg_snapshots_tx_legs() TO service_role;
CREATE TABLE public.daily_snapshots (snapshot_date date NOT NULL, user_id uuid NOT NULL, total_equity numeric, intraday_cashflow numeric, intraday_fee numeric, intraday_tax numeric, intraday_interest numeric, total_cashflow numeric, intraday_pnl numeric, intraday_return numeric);
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ADD CONSTRAINT daily_snapshots_pkey PRIMARY KEY (user_id, snapshot_date);
ALTER TABLE public.daily_snapshots ADD CONSTRAINT daily_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
GRANT ALL ON public.daily_snapshots TO anon;
GRANT ALL ON public.daily_snapshots TO authenticated;
GRANT ALL ON public.daily_snapshots TO service_role;
CREATE POLICY daily_snapshots_select_own ON public.daily_snapshots FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE TRIGGER after_new_fxrate_ins AFTER INSERT ON public.historical_fxrate REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_snapshots_fxrate();
CREATE TRIGGER after_new_fxrate_upd AFTER UPDATE ON public.historical_fxrate REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_snapshots_fxrate();
CREATE TRIGGER after_new_prices_ins AFTER INSERT ON public.historical_prices REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_snapshots_prices();
CREATE TRIGGER after_new_prices_upd AFTER UPDATE ON public.historical_prices REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_snapshots_prices();
CREATE VIEW public.benchmark_all WITH (security_invoker=true) AS WITH vnindex AS (
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
CREATE VIEW public.benchmark_yearly WITH (security_invoker=true) AS WITH vnindex AS (
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
CREATE VIEW public.cashflow_all WITH (security_invoker=true) AS SELECT sum(GREATEST(intraday_cashflow, (0)::numeric)) AS deposits,
    sum(LEAST(intraday_cashflow, (0)::numeric)) AS withdrawals
   FROM public.daily_snapshots
  WHERE (user_id = auth.uid());
CREATE VIEW public.cashflow_yearly WITH (security_invoker=true) AS SELECT EXTRACT(year FROM snapshot_date) AS year,
    sum(GREATEST(intraday_cashflow, (0)::numeric)) AS deposits,
    sum(LEAST(intraday_cashflow, (0)::numeric)) AS withdrawals
   FROM public.daily_snapshots
  WHERE (user_id = auth.uid())
  GROUP BY (EXTRACT(year FROM snapshot_date))
  ORDER BY (EXTRACT(year FROM snapshot_date));
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
     CROSS JOIN LATERAL ( SELECT daily_snapshots.total_equity
           FROM public.daily_snapshots
          WHERE (daily_snapshots.user_id = auth.uid())
          ORDER BY daily_snapshots.snapshot_date DESC
         LIMIT 1) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(p.last3m_date, p.today), 'last_6m', public.get_equity_chart(p.last6m_date, p.today), 'last_1y', public.get_equity_chart(p.last1y_date, p.today), 'all', public.get_equity_chart(p.inception_date, p.today)) AS equitychart
           FROM periods p) ec);
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
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.trg_snapshots_tx_legs();
