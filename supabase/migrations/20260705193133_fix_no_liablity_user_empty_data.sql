SET check_function_bodies = false;
DROP FUNCTION public.add_cashflow_event(p_operation text, p_asset_id uuid, p_quantity numeric, p_fx_rate numeric, p_memo text, p_created_at timestamp with time zone);
DROP VIEW public.benchmark_all;
DROP VIEW public.benchmark_yearly;
DROP VIEW public.cashflow_all;
DROP VIEW public.cashflow_yearly;
DROP VIEW public.equity_rollings;
DROP VIEW public.pnl_expense_all;
DROP VIEW public.pnl_expense_last1y;
DROP VIEW public.pnl_expense_yearly;
DROP MATERIALIZED VIEW public.daily_snapshots;
CREATE FUNCTION public.add_cashflow_event(p_operation text, p_asset_id uuid, p_quantity numeric, p_fx_rate numeric, p_memo text, p_created_at timestamp with time zone DEFAULT now(), p_user_id uuid DEFAULT auth.uid())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare
  v_tx_id uuid;
  v_asset_currency text;
  v_fx_rate numeric;
begin
  -- Find asset currency
  select a.currency_code into v_asset_currency
  from public.assets a
  where a.id = p_asset_id;

  -- Determine FX rate
  if v_asset_currency = 'VND' then v_fx_rate := 1;
  else v_fx_rate := coalesce(p_fx_rate, 1);
  end if;

  -- Insert into tx_entries
  insert into public.tx_entries (
    category,
    memo,
    user_id,
    created_at
  )
  values (
    'cashflow',
    p_memo,
    p_user_id,
    COALESCE(p_created_at, now())
  )
  returning id into v_tx_id;

  -- Insert into tx_cashflow
  insert into public.tx_cashflow (
    tx_id,
    asset_id,
    operation,
    quantity,
    fx_rate
  )
  values (
    v_tx_id,
    p_asset_id,
    p_operation::cashflow_ops,
    p_quantity,
    v_fx_rate
  );
end;$function$;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone, uuid) TO anon;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone, uuid) TO service_role;
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
             LEFT JOIN LATERAL ( SELECT (hp.close * (1000)::numeric) AS price
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
            b_1.tx_id AS borrow_tx_id,
            b_1.principal,
            b_1.rate,
            (e_b.created_at)::date AS borrow_date,
            (e_r.created_at)::date AS repay_date
           FROM (((public.tx_borrow b_1
             JOIN public.tx_entries e_b ON ((e_b.id = b_1.tx_id)))
             LEFT JOIN public.tx_repay r ON ((r.borrow_tx = b_1.tx_id)))
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
        ), cashflow_per_day AS (
         SELECT e.user_id,
            (e.created_at)::date AS snapshot_date,
            COALESCE((sum(tl.credit) - sum(tl.debit)), (0)::numeric) AS intraday_cashflow
           FROM (((public.tx_entries e
             JOIN public.tx_legs tl ON ((tl.tx_id = e.id)))
             JOIN public.assets a ON ((a.id = tl.asset_id)))
             JOIN public.tx_cashflow cf ON ((cf.tx_id = e.id)))
          WHERE ((cf.operation = ANY (ARRAY['deposit'::public.cashflow_ops, 'withdraw'::public.cashflow_ops])) AND (a.asset_class = 'equity'::public.asset_class))
          GROUP BY e.user_id, ((e.created_at)::date)
        ), tax_fee_per_day AS (
         SELECT e.user_id,
            (e.created_at)::date AS snapshot_date,
            (COALESCE(sum(s.fee), (0)::numeric) + COALESCE(sum(cf.net_proceed) FILTER (WHERE (e.memo = 'Operational fees'::text)), (0)::numeric)) AS total_fees,
            COALESCE(sum(s.tax), (0)::numeric) AS total_taxes,
            COALESCE(sum(r.interest), (0)::numeric) AS loan_interest,
            COALESCE(sum(cf.net_proceed) FILTER (WHERE (e.memo = ANY (ARRAY['Margin interest'::text, 'Cash advance interest'::text]))), (0)::numeric) AS margin_interest
           FROM (((public.tx_entries e
             LEFT JOIN public.tx_repay r ON ((r.tx_id = e.id)))
             LEFT JOIN public.tx_stock s ON ((s.tx_id = e.id)))
             LEFT JOIN public.tx_cashflow cf ON ((cf.tx_id = e.id)))
          GROUP BY e.user_id, ((e.created_at)::date)
        ), base AS (
         SELECT d.snapshot_date,
            d.user_id,
            COALESCE(nc.intraday_cashflow, (0)::numeric) AS intraday_cashflow,
            round((COALESCE(tad.total_assets, (0)::numeric) - COALESCE(tld.total_liabilities, (0)::numeric))) AS total_equity,
            COALESCE(tf.total_fees, (0)::numeric) AS intraday_fee,
            COALESCE(tf.total_taxes, (0)::numeric) AS intraday_tax,
            COALESCE((tf.loan_interest + tf.margin_interest), (0)::numeric) AS intraday_interest
           FROM ((((user_days d
             LEFT JOIN total_assets_per_day tad ON (((tad.snapshot_date = d.snapshot_date) AND (tad.user_id = d.user_id))))
             LEFT JOIN total_liabilities_per_day tld ON (((tld.snapshot_date = d.snapshot_date) AND (tld.user_id = d.user_id))))
             LEFT JOIN cashflow_per_day nc ON (((nc.snapshot_date = d.snapshot_date) AND (nc.user_id = d.user_id))))
             LEFT JOIN tax_fee_per_day tf ON (((tf.snapshot_date = d.snapshot_date) AND (tf.user_id = d.user_id))))
        )
 SELECT snapshot_date,
    user_id,
    total_equity,
    intraday_cashflow,
    intraday_fee,
    intraday_tax,
    intraday_interest,
    round(sum(intraday_cashflow) OVER (PARTITION BY user_id ORDER BY snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS total_cashflow,
        CASE
            WHEN (lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date) IS NULL) THEN (0)::numeric
            WHEN (lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date) = (0)::numeric) THEN (0)::numeric
            ELSE ((total_equity - intraday_cashflow) - lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date))
        END AS intraday_pnl,
        CASE
            WHEN (lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date) IS NULL) THEN (0)::numeric
            WHEN (lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date) = (0)::numeric) THEN (0)::numeric
            ELSE (((total_equity - intraday_cashflow) - lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date)) / NULLIF(lag(total_equity) OVER (PARTITION BY user_id ORDER BY snapshot_date), (0)::numeric))
        END AS intraday_return
   FROM base b WITH DATA;
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
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
