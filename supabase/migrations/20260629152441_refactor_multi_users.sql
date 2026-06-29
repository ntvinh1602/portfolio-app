create type "public"."tx_category" as enum ('stock', 'cashflow', 'debt');

drop view if exists "public"."equity_return_data";

drop view if exists "public"."last_1y_profit";

drop view if exists "public"."performance_data";

drop view if exists "public"."stock_annual_pnl";

drop view if exists "public"."tx_summary";

drop view if exists "public"."yearly_snapshots";

drop function if exists "public"."calculate_pnl"(p_start_date date, p_end_date date);

drop function if exists "public"."calculate_twr"(p_start_date date, p_end_date date);

drop function if exists "public"."get_equity_chart"(p_start_date date, p_end_date date, p_threshold integer);

drop function if exists "public"."get_return_chart"(p_start_date date, p_end_date date, p_threshold integer);

drop view if exists "public"."balance_sheet";

drop view if exists "public"."monthly_snapshots";

drop view if exists "public"."outstanding_debts";

drop materialized view if exists "public"."daily_snapshots";

alter table "public"."asset_positions" drop constraint "stock_positions_pkey";

drop index if exists "public"."stock_positions_pkey";

alter table "public"."asset_positions" add column "user_id" uuid not null;

alter table "public"."tx_entries" add column "user_id" uuid;

alter table "public"."tx_entries" alter column "category" set data type public.tx_category using "category"::public.tx_category;

alter table "public"."tx_entries" alter column "memo" set not null;

ALTER TABLE tx_stock DROP COLUMN net_proceed;

ALTER TABLE tx_stock DROP COLUMN side;

ALTER TABLE tx_stock ADD COLUMN operation text NOT NULL;

ALTER TABLE tx_stock ADD COLUMN net_proceed numeric
GENERATED ALWAYS AS (
  CASE
    WHEN operation = 'buy' THEN (price * quantity) + fee + tax
    WHEN operation = 'sell' THEN (price * quantity) - fee - tax
    ELSE 0
  END
) STORED;

CREATE UNIQUE INDEX asset_positions_pkey ON public.asset_positions USING btree (user_id, asset_id);

alter table "public"."asset_positions" add constraint "asset_positions_pkey" PRIMARY KEY using index "asset_positions_pkey";

alter table "public"."asset_positions" add constraint "asset_positions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."asset_positions" validate constraint "asset_positions_user_id_fkey";

alter table "public"."tx_entries" add constraint "tx_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."tx_entries" validate constraint "tx_entries_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_pnl(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_equity NUMERIC;
  v_end_equity NUMERIC;
  v_cash_flow NUMERIC;
  v_pnl NUMERIC;
BEGIN
  SELECT net_equity INTO v_start_equity
  FROM public.daily_snapshots
  WHERE user_id = p_user_id AND snapshot_date < p_start_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_start_equity IS NULL THEN
    SELECT (net_equity - net_cashflow) INTO v_start_equity
    FROM public.daily_snapshots
    WHERE user_id = p_user_id AND snapshot_date >= p_start_date
    ORDER BY snapshot_date ASC LIMIT 1;
  END IF;

  SELECT net_equity INTO v_end_equity
  FROM public.daily_snapshots
  WHERE user_id = p_user_id AND snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT COALESCE(SUM(net_cashflow), 0) INTO v_cash_flow
  FROM public.daily_snapshots
  WHERE user_id = p_user_id
    AND snapshot_date >= p_start_date AND snapshot_date <= p_end_date;

  v_pnl := round((COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow);
  RETURN v_pnl;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_twr(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_index NUMERIC;
  v_end_index NUMERIC;
  v_twr NUMERIC;
BEGIN
  SELECT equity_index INTO v_start_index
  FROM public.daily_snapshots
  WHERE user_id = p_user_id AND snapshot_date < p_start_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_start_index IS NULL THEN v_start_index := 100; END IF;

  SELECT equity_index INTO v_end_index
  FROM public.daily_snapshots
  WHERE user_id = p_user_id AND snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC LIMIT 1;

  IF v_end_index IS NULL THEN RETURN 0; END IF;

  v_twr := round(((v_end_index / v_start_index) - 1) * 100, 1);
  RETURN v_twr;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_equity_chart(p_user_id uuid, p_start_date date, p_end_date date, p_threshold integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  raw_data public.equity_point[];
  result_data public.equity_point[];
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
  selected public.equity_point;
  prev public.equity_point;
  final_result jsonb;
BEGIN
  -- Load dataset into memory
  SELECT array_agg(
           ROW(snapshot_date, net_equity, cumulative_cashflow)::public.equity_point
           ORDER BY snapshot_date
         )
  INTO raw_data
  FROM public.daily_snapshots
  WHERE user_id = p_user_id
    AND snapshot_date BETWEEN p_start_date AND p_end_date;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_build_object(
        'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
        'e', jsonb_agg(round(x.net_equity)               ORDER BY x.ord),
        'c', jsonb_agg(round(x.cumulative_cashflow)      ORDER BY x.ord)
      )
      FROM unnest(raw_data) WITH ORDINALITY
          AS x(snapshot_date, net_equity, cumulative_cashflow, ord)
    );
  END IF;

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
      AVG(r.net_equity)
    INTO avg_x, avg_y
    FROM unnest(raw_data[range_start:range_end]) r;

    max_area := -1;
    prev := result_data[array_length(result_data,1)];

    FOR selected IN
      SELECT * FROM unnest(raw_data[range_start:range_end])
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev.snapshot_date) - avg_x)
        * (selected.net_equity - prev.net_equity)
        -
        (EXTRACT(EPOCH FROM prev.snapshot_date)
         - EXTRACT(EPOCH FROM selected.snapshot_date))
        * (avg_y - prev.net_equity)
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
    'e', jsonb_agg(round(x.net_equity)               ORDER BY x.ord),
    'c', jsonb_agg(round(x.cumulative_cashflow)      ORDER BY x.ord)
  )
  INTO final_result
  FROM unnest(result_data) WITH ORDINALITY
      AS x(snapshot_date, net_equity, cumulative_cashflow, ord);

  RETURN final_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_return_chart(p_user_id uuid, p_start_date date, p_end_date date, p_threshold integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_portfolio_value numeric;
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
  -- Get normalization anchors
  SELECT equity_index
  INTO v_first_portfolio_value
  FROM public.daily_snapshots
  WHERE user_id = p_user_id AND snapshot_date >= p_start_date
  ORDER BY snapshot_date
  LIMIT 1;

  SELECT hp.close
  INTO v_first_vni_value
  FROM historical_prices hp
    JOIN assets a ON a.id = hp.asset_id
  WHERE a.ticker = '^VNINDEX'
    AND hp.date >= p_start_date
  ORDER BY hp.date
  LIMIT 1;

  -- Load dataset into memory array with normalized values
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
      (hp.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM daily_snapshots pd
      JOIN historical_prices hp ON pd.snapshot_date = hp.date
      JOIN assets a ON a.id = hp.asset_id
    WHERE pd.user_id = p_user_id
      AND pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND a.ticker = '^VNINDEX'
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

  -- LTTB sampling
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
$function$
;

CREATE OR REPLACE FUNCTION public.add_borrow_event(p_principal numeric, p_lender text, p_rate numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_tx_id uuid;
begin
  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id)
  values (
    'debt',
    'Borrow ' || p_principal::text || ' from ' || p_lender || ' at ' || to_char(p_rate, 'FM90.##%'),
    auth.uid()
  )
  returning id into v_tx_id;

  -- Insert into tx_debt
  insert into public.tx_debt (
    tx_id,
    operation,
    principal,
    lender,
    rate
  )
  values (
    v_tx_id,
    'borrow',
    p_principal,
    p_lender,
    p_rate
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.add_cashflow_event(p_operation text, p_asset_id uuid, p_quantity numeric, p_fx_rate numeric, p_memo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  insert into public.tx_entries (category, memo, user_id)
  values ('cashflow', p_memo, auth.uid())
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.add_repay_event(p_repay_tx uuid, p_interest numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_tx_id uuid;
  v_lender text;
  v_principal text;
begin
  -- Find lender name
  select d.lender into v_lender
  from public.tx_debt d where d.tx_id = p_repay_tx;

  -- Find principal amount
  select d.principal into v_principal
  from public.tx_debt d where d.tx_id = p_repay_tx;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id)
  values (
    'debt',
    'Repay to ' || v_lender,
    auth.uid()
  ) returning id into v_tx_id;

  -- Insert into tx_cashflow
  insert into public.tx_debt (
    tx_id,
    operation,
    principal,
    interest,
    repay_tx
  )
  values (
    v_tx_id,
    'repay',
    v_principal,
    p_interest,
    p_repay_tx
  );
end;$function$
;

CREATE OR REPLACE FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tx_id uuid;
  v_stock_id uuid;
begin
  -- Find stock id
  select a.id into v_stock_id from public.assets a where a.ticker = p_ticker;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id)
  values (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text,
    auth.uid()
  ) returning id into v_tx_id;

  -- Insert into tx_stock
  insert into public.tx_stock (
    tx_id,
    operation,
    stock_id,
    price,
    quantity,
    fee,
    tax
  )
  values (
    v_tx_id,
    p_side,
    v_stock_id,
    p_price,
    p_quantity,
    p_fee,
    coalesce(p_tax, 0)
  );
end;
$function$
;

create materialized view "public"."daily_snapshots" as  WITH dates AS (
         SELECT (generate_series((GREATEST('2021-11-09'::date, COALESCE(( SELECT (min(tx_entries.created_at))::date AS min
                   FROM public.tx_entries), '2021-11-09'::date)))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::date AS snapshot_date
        ), business_days AS (
         SELECT dates.snapshot_date
           FROM dates
          WHERE (EXTRACT(isodow FROM dates.snapshot_date) <> ALL ((ARRAY[6, 7])::numeric[]))
        ), users AS (
         SELECT DISTINCT tx_entries.user_id
           FROM public.tx_entries
          WHERE (tx_entries.user_id IS NOT NULL)
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
             CROSS JOIN LATERAL generate_series((GREATEST(ai.valid_from, GREATEST('2021-11-09'::date, COALESCE(( SELECT (min(tx_entries.created_at))::date AS min
                   FROM public.tx_entries), '2021-11-09'::date))))::timestamp without time zone, (LEAST((ai.valid_to - 1), CURRENT_DATE))::timestamp without time zone, '1 day'::interval) gs(d))
          WHERE (EXTRACT(isodow FROM gs.d) <> ALL ((ARRAY[6, 7])::numeric[]))
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
           FROM (((public.tx_debt b
             JOIN public.tx_entries e_b ON ((e_b.id = b.tx_id)))
             LEFT JOIN public.tx_debt r ON (((r.repay_tx = b.tx_id) AND (r.operation = 'repay'::text))))
             LEFT JOIN public.tx_entries e_r ON ((e_r.id = r.tx_id)))
          WHERE (b.operation = 'borrow'::text)
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
             CROSS JOIN business_days d)
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
            u.user_id,
            COALESCE(nc.net_cashflow, (0)::numeric) AS net_cashflow,
            round((COALESCE(tad.total_assets, (0)::numeric) - COALESCE(tld.total_liabilities, (0)::numeric))) AS net_equity
           FROM ((((business_days d
             CROSS JOIN users u)
             LEFT JOIN total_assets_per_day tad ON (((tad.snapshot_date = d.snapshot_date) AND (tad.user_id = u.user_id))))
             LEFT JOIN total_liabilities_per_day tld ON (((tld.snapshot_date = d.snapshot_date) AND (tld.user_id = u.user_id))))
             LEFT JOIN net_cashflow_per_day nc ON (((nc.snapshot_date = d.snapshot_date) AND (nc.user_id = u.user_id))))
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
                END AS daily_return
           FROM base b
        ), with_index AS (
         SELECT with_returns.snapshot_date,
            with_returns.user_id,
            with_returns.net_equity,
            with_returns.net_cashflow,
            with_returns.cumulative_cashflow,
            with_returns.daily_return,
            round(((exp(sum(ln(GREATEST(abs(COALESCE(((1)::numeric + with_returns.daily_return), (1)::numeric)), 0.000000000001))) OVER (PARTITION BY with_returns.user_id ORDER BY with_returns.snapshot_date)) * (100)::numeric) * (
                CASE
                    WHEN ((count(*) FILTER (WHERE (((1)::numeric + with_returns.daily_return) < (0)::numeric)) OVER (PARTITION BY with_returns.user_id ORDER BY with_returns.snapshot_date) % (2)::bigint) = 1) THEN '-1'::integer
                    ELSE 1
                END)::numeric), 2) AS equity_index
           FROM with_returns
        )
 SELECT snapshot_date,
    user_id,
    net_equity,
    net_cashflow,
    cumulative_cashflow,
    equity_index
   FROM with_index;


create or replace view "public"."monthly_snapshots" with (security_invoker = true) as  WITH month_ranges AS (
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
            COALESCE(sum(d.interest), (0)::numeric) AS loan_interest,
            COALESCE(sum(cf.net_proceed) FILTER (WHERE (t.memo ~~* '%interest%'::text)), (0)::numeric) AS margin_interest
           FROM (((public.tx_entries t
             LEFT JOIN public.tx_debt d ON ((d.tx_id = t.id)))
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


create or replace view "public"."outstanding_debts" with (security_invoker = true) as  WITH borrow_tx AS (
         SELECT d.tx_id,
            d.lender,
            d.principal,
            d.rate,
            e.created_at AS borrow_date,
            e.user_id
           FROM (public.tx_debt d
             JOIN public.tx_entries e ON ((e.id = d.tx_id)))
          WHERE ((d.operation = 'borrow'::text) AND (e.user_id = auth.uid()) AND (NOT (d.tx_id IN ( SELECT DISTINCT tx_debt.repay_tx
                   FROM public.tx_debt
                  WHERE (tx_debt.repay_tx IS NOT NULL)))))
        )
 SELECT tx_id,
    lender,
    principal,
    rate,
    borrow_date,
    EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - borrow_date)) AS duration,
    round(((principal * power(((1)::numeric + ((rate / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - borrow_date)))) - principal), 2) AS interest
   FROM borrow_tx b
  ORDER BY borrow_date;


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

CREATE OR REPLACE FUNCTION public.process_tx_cashflow(p_tx_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r tx_cashflow%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_cash_currency text;
  v_new_qty numeric;
  v_new_avg_cost numeric;
  v_user_id uuid;
BEGIN
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'tx_entries.user_id is NULL for tx_id %', p_tx_id;
  END IF;

  -- Load transaction
  SELECT * INTO r FROM public.tx_cashflow WHERE tx_id = p_tx_id;

  -- Identify assets
  v_cash_asset := r.asset_id;
  SELECT currency_code INTO v_cash_currency FROM public.assets WHERE id = v_cash_asset;
  SELECT id INTO v_equity_asset FROM public.assets WHERE ticker = 'CAPITAL';

  -- Clear existing legs
  DELETE FROM public.tx_legs WHERE tx_id = p_tx_id;

  -- Handle by operation type
  IF r.operation IN ('deposit', 'income') THEN
    -- Debit cash
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_cash_asset, r.quantity, r.net_proceed, 0);

    -- Credit equity (capital in)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, r.net_proceed, 0, r.net_proceed);

    -- Only update cost basis for non-VND assets
    IF v_cash_currency <> 'VND' THEN
      SELECT * INTO v_pos
      FROM public.asset_positions
      WHERE user_id = v_user_id AND asset_id = v_cash_asset;

      IF NOT FOUND THEN
        INSERT INTO public.asset_positions (user_id, asset_id, quantity, average_cost)
        VALUES (v_user_id, v_cash_asset, 0, 0)
        RETURNING * INTO v_pos;
      END IF;

      v_new_qty := v_pos.quantity + r.quantity;
      v_new_avg_cost := (v_pos.average_cost * v_pos.quantity + r.net_proceed)
                        / v_new_qty;

      UPDATE public.asset_positions
      SET quantity = v_new_qty, average_cost = v_new_avg_cost
      WHERE user_id = v_user_id AND asset_id = v_cash_asset;
    END IF;

  ELSE -- Withdraw and expense operation
    -- Credit cash (reduce balance)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_cash_asset, -r.quantity, 0, r.net_proceed);

    -- Debit equity (capital out)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, -r.net_proceed, r.net_proceed, 0);

    -- Only update positions for non-VND
    IF v_cash_currency <> 'VND' THEN
      SELECT * INTO v_pos
      FROM public.asset_positions
      WHERE user_id = v_user_id AND asset_id = v_cash_asset;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No position found for user % asset %, cannot withdraw',
          v_user_id, v_cash_asset;
      END IF;

      IF v_pos.quantity < r.quantity THEN
        RAISE EXCEPTION 'Not enough balance to withdraw %', r.tx_id;
      END IF;

      UPDATE public.asset_positions
      SET quantity = v_pos.quantity - r.quantity
      WHERE user_id = v_user_id AND asset_id = v_cash_asset;
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_tx_stock(p_tx_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r tx_stock%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_stock_asset uuid;
  v_new_qty numeric;
  v_new_avg_cost numeric;
  v_realized_gain numeric := 0;
  v_cost_basis numeric := 0;
  v_user_id uuid;
begin
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'tx_entries.user_id is NULL for tx_id %', p_tx_id;
  END IF;

  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  v_stock_asset := r.stock_id;

  -- Fetch or initialize position (scoped by user_id)
  select * into v_pos
  from public.asset_positions
  where user_id = v_user_id and asset_id = r.stock_id;

  if not found then
    insert into public.asset_positions (user_id, asset_id, quantity, average_cost)
    values (v_user_id, r.stock_id, 0, 0)
    returning * into v_pos;
  end if;

  -- Process transaction
  if r.operation = 'buy' then
    v_new_qty := v_pos.quantity + r.quantity;
    v_new_avg_cost :=
      case
        when v_new_qty = 0 then 0
        else (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty
      end;

    update public.asset_positions
    set quantity = v_new_qty,
      average_cost = v_new_avg_cost
    where user_id = v_user_id and asset_id = r.stock_id;

    -- Generate ledger for BUY
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit stock (increase holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, r.quantity, r.net_proceed, 0);

    -- Credit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  else -- Sell side
    if v_pos.quantity < r.quantity then
      raise exception 'Not enough shares to sell for stock %', r.stock_id;
    end if;

    v_cost_basis := v_pos.average_cost * r.quantity;
    v_realized_gain := r.net_proceed - v_cost_basis;

    update public.asset_positions
    set quantity = v_pos.quantity - r.quantity
    where user_id = v_user_id and asset_id = r.stock_id;

    -- Generate ledger for SELL
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit stock (reduce holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, -r.quantity, 0, v_cost_basis);

    -- Post gain/loss to equity
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (
      r.tx_id,
      v_equity_asset,
      v_realized_gain,
      GREATEST(-v_realized_gain, 0),
      GREATEST(v_realized_gain, 0)
    );
  end if;
end;
$function$
;

create or replace view "public"."stock_annual_pnl" with (security_invoker = true) as  WITH capital_legs AS (
         SELECT tl.tx_id,
            (tl.credit - tl.debit) AS capital_amount,
            t.created_at,
            t.user_id
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
 SELECT c.user_id,
    (EXTRACT(year FROM c.created_at))::integer AS year,
    a.ticker,
    a.name,
    a.logo_url,
    sum(c.capital_amount) AS total_pnl
   FROM ((capital_legs c
     JOIN stock_legs s ON ((s.tx_id = c.tx_id)))
     JOIN public.assets a ON ((a.id = s.stock_id)))
  GROUP BY c.user_id, a.logo_url, a.name, a.ticker, (EXTRACT(year FROM c.created_at));


create or replace view "public"."tx_summary" with (security_invoker = true) as  SELECT t.id,
    t.created_at,
    t.category,
        CASE
            WHEN (t.category = 'stock'::public.tx_category) THEN s.operation
            WHEN (t.category = 'cashflow'::public.tx_category) THEN (cf.operation)::text
            ELSE d.operation
        END AS operation,
        CASE
            WHEN (t.category = 'stock'::public.tx_category) THEN s.net_proceed
            WHEN (t.category = 'cashflow'::public.tx_category) THEN cf.net_proceed
            ELSE d.net_proceed
        END AS value,
    t.memo
   FROM (((public.tx_entries t
     LEFT JOIN public.tx_stock s ON ((t.id = s.tx_id)))
     LEFT JOIN public.tx_cashflow cf ON ((t.id = cf.tx_id)))
     LEFT JOIN public.tx_debt d ON ((t.id = d.tx_id)))
  WHERE (t.user_id = auth.uid());


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
                    ELSE (((t.last_value - t.first_value) / t.first_value) * (100)::numeric)
                END, 2) AS equity_ret
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
                    ELSE (((t.last_value - t.first_value) / t.first_value) * (100)::numeric)
                END, 2) AS vn_ret
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
                    ELSE (((t.last_value - t.first_value) / t.first_value) * (100)::numeric)
                END, 2) AS equity_ret
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


create or replace view "public"."balance_sheet" with (security_invoker = true) as  WITH user_legs AS (
         SELECT tl.tx_id,
            tl.asset_id,
            tl.quantity,
            tl.debit,
            tl.credit
           FROM (public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
          WHERE (e.user_id = auth.uid())
        ), stock AS (
         SELECT a.ticker,
                CASE
                    WHEN (a.asset_class = 'stock'::public.asset_class) THEN sp.price
                    ELSE er.rate
                END AS mkt_price,
            (sum(ul.debit) - sum(ul.credit)) AS cost_basis,
            sum(((ul.quantity * COALESCE(sp.price, (1)::numeric)) * COALESCE(er.rate, (1)::numeric))) AS market_value,
            (sum(((ul.quantity * COALESCE(sp.price, (1)::numeric)) * COALESCE(er.rate, (1)::numeric))) - (sum(ul.debit) - sum(ul.credit))) AS net_profit
           FROM (((public.assets a
             JOIN user_legs ul ON ((a.id = ul.asset_id)))
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
         SELECT GREATEST((- sum(ul.quantity)), (0)::numeric) AS "greatest"
           FROM (user_legs ul
             JOIN public.assets a ON ((ul.asset_id = a.id)))
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
                    ELSE GREATEST(sum(ul.quantity), (0)::numeric)
                END AS quantity
           FROM (public.assets a
             LEFT JOIN user_legs ul ON ((ul.asset_id = a.id)))
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
         SELECT public.calculate_pnl(auth.uid(), periods.ytd_date, periods.today) AS pnl_ytd,
            public.calculate_pnl(auth.uid(), periods.mtd_date, periods.today) AS pnl_mtd,
            public.calculate_twr(auth.uid(), periods.ytd_date, periods.today) AS twr_ytd,
            public.calculate_twr(auth.uid(), periods.inception_date, periods.today) AS twr_all,
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
     CROSS JOIN LATERAL ( SELECT round(sum(bs.total_value)) AS total_equity
           FROM public.balance_sheet bs
          WHERE (bs.asset_class = 'equity'::public.asset_class)) b)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_equity_chart(auth.uid(), p.last3m_date, p.today), 'last_6m', public.get_equity_chart(auth.uid(), p.last6m_date, p.today), 'last_1y', public.get_equity_chart(auth.uid(), p.last1y_date, p.today), 'all', public.get_equity_chart(auth.uid(), p.inception_date, p.today)) AS equitychart
           FROM periods p) ec)
     CROSS JOIN LATERAL ( SELECT jsonb_build_object('last_3m', public.get_return_chart(auth.uid(), p.last3m_date, p.today), 'last_6m', public.get_return_chart(auth.uid(), p.last6m_date, p.today), 'last_1y', public.get_return_chart(auth.uid(), p.last1y_date, p.today), 'all', public.get_return_chart(auth.uid(), p.inception_date, p.today)) AS returnchart
           FROM periods p) rc);


create or replace view "public"."last_1y_profit" with (security_invoker = true) as  SELECT round(sum(pnl)) AS total_pnl,
    round(avg(pnl)) AS avg_profit,
    (- round(avg(((COALESCE(interest, (0)::numeric) + COALESCE(tax, (0)::numeric)) + COALESCE(fee, (0)::numeric))))) AS avg_expense,
    jsonb_build_object('snapshot_date', jsonb_agg((snapshot_date)::text ORDER BY snapshot_date), 'revenue', jsonb_agg((((COALESCE(pnl, (0)::numeric) + COALESCE(fee, (0)::numeric)) + COALESCE(interest, (0)::numeric)) + COALESCE(tax, (0)::numeric)) ORDER BY snapshot_date), 'fee', jsonb_agg(COALESCE((- fee), (0)::numeric) ORDER BY snapshot_date), 'interest', jsonb_agg(COALESCE((- interest), (0)::numeric) ORDER BY snapshot_date), 'tax', jsonb_agg(COALESCE((- tax), (0)::numeric) ORDER BY snapshot_date)) AS profit_chart
   FROM ( SELECT ms2.snapshot_date,
            ms2.pnl,
            ms2.interest,
            ms2.tax,
            ms2.fee
           FROM public.monthly_snapshots ms2
          WHERE (ms2.user_id = auth.uid())
          ORDER BY ms2.snapshot_date DESC
         LIMIT 12) ms;


create or replace view "public"."performance_data" with (security_invoker = true) as  WITH stock_base AS (
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
    public.get_return_chart(c.user_id, db.start_date, db.end_date) AS return_chart
   FROM (combined c
     JOIN date_bounds db ON (((db.user_id = c.user_id) AND (db.year = c.year))));


CREATE UNIQUE INDEX daily_snapshots_date_user_uidx ON public.daily_snapshots USING btree (snapshot_date, user_id);


