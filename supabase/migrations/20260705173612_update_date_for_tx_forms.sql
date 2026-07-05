


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "flight";


ALTER SCHEMA "flight" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "flight"."seat_position" AS ENUM (
    'window',
    'middle',
    'aisle'
);


ALTER TYPE "flight"."seat_position" OWNER TO "postgres";


CREATE TYPE "flight"."seat_type" AS ENUM (
    'eco',
    'biz'
);


ALTER TYPE "flight"."seat_type" OWNER TO "postgres";


CREATE TYPE "public"."asset_class" AS ENUM (
    'cash',
    'stock',
    'crypto',
    'fund',
    'equity',
    'liability',
    'index'
);


ALTER TYPE "public"."asset_class" OWNER TO "postgres";


CREATE TYPE "public"."benchmark_point" AS (
	"snapshot_date" "date",
	"portfolio_value" numeric,
	"vni_value" numeric
);


ALTER TYPE "public"."benchmark_point" OWNER TO "postgres";


CREATE TYPE "public"."cashflow_ops" AS ENUM (
    'deposit',
    'withdraw',
    'income',
    'expense'
);


ALTER TYPE "public"."cashflow_ops" OWNER TO "postgres";


CREATE TYPE "public"."dnse_order_status" AS ENUM (
    'Pending',
    'PendingNew',
    'New',
    'PartiallyFilled',
    'Filled',
    'PendingReplace',
    'PendingCancel',
    'Canceled',
    'Rejected',
    'Expired',
    'DoneForDay'
);


ALTER TYPE "public"."dnse_order_status" OWNER TO "postgres";


CREATE TYPE "public"."equity_point" AS (
	"snapshot_date" "date",
	"total_cashflow" numeric,
	"total_equity" numeric
);


ALTER TYPE "public"."equity_point" OWNER TO "postgres";


CREATE TYPE "public"."stock_ops" AS ENUM (
    'buy',
    'sell'
);


ALTER TYPE "public"."stock_ops" OWNER TO "postgres";


CREATE TYPE "public"."tx_category" AS ENUM (
    'stock',
    'cashflow',
    'borrow',
    'repay'
);


ALTER TYPE "public"."tx_category" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "flight"."insert_flight_with_timezone"("p_flight_number" "text", "p_airline_id" "uuid", "p_aircraft_id" "uuid", "p_departure_airport_id" "uuid", "p_arrival_airport_id" "uuid", "p_departure_local" "text", "p_arrival_local" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'flight'
    AS $$
declare
  dep_tz text;
  arr_tz text;
  dep_utc timestamptz;
  arr_utc timestamptz;
begin
  select timezone into dep_tz
  from airports
  where id = p_departure_airport_id;

  select timezone into arr_tz
  from airports
  where id = p_arrival_airport_id;

  -- Convert local timestamp (without tz) into UTC
  dep_utc := (p_departure_local::timestamp at time zone dep_tz);
  arr_utc := (p_arrival_local::timestamp at time zone arr_tz);

  insert into flights (
    user_id,
    flight_number,
    airline_id,
    aircraft_id,
    departure_airport_id,
    arrival_airport_id,
    departure_time,
    arrival_time
  )
  values (
    auth.uid(),
    p_flight_number,
    p_airline_id,
    p_aircraft_id,
    p_departure_airport_id,
    p_arrival_airport_id,
    dep_utc,
    arr_utc
  );
end;
$$;


ALTER FUNCTION "flight"."insert_flight_with_timezone"("p_flight_number" "text", "p_airline_id" "uuid", "p_aircraft_id" "uuid", "p_departure_airport_id" "uuid", "p_arrival_airport_id" "uuid", "p_departure_local" "text", "p_arrival_local" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."active_stock_tickers"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$select coalesce(
  jsonb_agg(ticker order by ticker),
  '[]'::jsonb
)
from (
  select a.ticker
  from public.tx_legs l
  join public.assets a on a.id = l.asset_id
  where a.asset_class = 'stock'
  group by a.ticker
  having sum(l.quantity) > 0

  union

  select 'VNINDEX' as ticker
) t(ticker);$$;


ALTER FUNCTION "public"."active_stock_tickers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric, "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare
  v_tx_id uuid;
begin
  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id, created_at)
  values (
    'borrow',
    'Borrow ' || p_principal::text || ' from ' || p_lender || ' at ' || to_char(p_rate, 'FM90.##%'),
    auth.uid(),
    COALESCE(p_created_at, now())
  )
  returning id into v_tx_id;

  -- Insert into tx_debt
  insert into public.tx_borrow (
    tx_id,
    lender,
    principal,
    rate
  )
  values (
    v_tx_id,
    p_lender,
    p_principal,
    p_rate
  );
end;$$;


ALTER FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric, "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare
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
    auth.uid(),
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
end;$$;


ALTER FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric, "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare
  v_tx_id uuid;
  v_lender text;
  v_principal numeric;
begin
  -- Find lender name
  select b.lender into v_lender
  from public.tx_borrow b where b.tx_id = p_repay_tx;

  -- Find principal amount
  select b.principal into v_principal
  from public.tx_borrow b where b.tx_id = p_repay_tx;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id, created_at)
  values (
    'repay',
    'Repay to ' || v_lender,
    auth.uid(),
    COALESCE(p_created_at, now())
  ) returning id into v_tx_id;

  -- Insert into tx_repay
  insert into public.tx_repay (
    tx_id,
    borrow_tx,
    principal,
    interest
  )
  values (
    v_tx_id,
    p_repay_tx,
    v_principal,
    p_interest
  );
end;$$;


ALTER FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric, "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric DEFAULT 0, "p_user_id" "uuid" DEFAULT "auth"."uid"(), "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx_id uuid;
  v_stock_id uuid;
BEGIN
  SELECT a.id INTO v_stock_id
  FROM public.assets a
  WHERE a.ticker = p_ticker;

  INSERT INTO public.tx_entries (category, memo, user_id, created_at)
  VALUES (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text,
    p_user_id,
    COALESCE(p_created_at, now())
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.tx_stock (tx_id, operation, stock_id, price, quantity, fee, tax)
  VALUES (v_tx_id, p_side::stock_ops, v_stock_id, p_price, p_quantity, p_fee, COALESCE(p_tax, 0));
END;
$$;


ALTER FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric, "p_user_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_pnl NUMERIC;
BEGIN
  SELECT COALESCE(sum(intraday_pnl), 0)
    INTO v_pnl
  FROM public.daily_snapshots
  WHERE user_id = auth.uid()
    AND snapshot_date >= p_start_date
    AND snapshot_date <= p_end_date;

  RETURN v_pnl;
END;$$;


ALTER FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_twr NUMERIC;
BEGIN
  SELECT COALESCE(EXP(SUM(LN(1 + intraday_return))) - 1, 0)
    INTO v_twr
  FROM public.daily_snapshots
  WHERE user_id = auth.uid()
    AND snapshot_date >= p_start_date
    AND snapshot_date <= p_end_date
    AND intraday_return IS NOT NULL
    AND intraday_return > -1;   -- guard against ln(0) / ln(negative)

  RETURN COALESCE(v_twr, 0);
END;
$$;


ALTER FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer DEFAULT 150) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$DECLARE
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
           ROW(snapshot_date, total_equity, total_cashflow)::public.equity_point
           ORDER BY snapshot_date
         )
  INTO raw_data
  FROM public.daily_snapshots
  WHERE user_id = auth.uid()
    AND snapshot_date BETWEEN p_start_date AND p_end_date;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_build_object(
        'd', jsonb_agg((extract(epoch from x.snapshot_date)/86400)::int ORDER BY x.ord),
        'e', jsonb_agg(round(x.total_equity) ORDER BY x.ord),
        'c', jsonb_agg(round(x.total_cashflow) ORDER BY x.ord)
      )
      FROM unnest(raw_data) WITH ORDINALITY
          AS x(snapshot_date, total_equity, total_cashflow, ord)
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
      AVG(r.total_equity)
    INTO avg_x, avg_y
    FROM unnest(raw_data[range_start:range_end]) r;

    max_area := -1;
    prev := result_data[array_length(result_data,1)];

    FOR selected IN
      SELECT * FROM unnest(raw_data[range_start:range_end])
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM prev.snapshot_date) - avg_x)
        * (selected.total_equity - prev.total_equity)
        -
        (EXTRACT(EPOCH FROM prev.snapshot_date)
         - EXTRACT(EPOCH FROM selected.snapshot_date))
        * (avg_y - prev.total_equity)
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
    'e', jsonb_agg(round(x.total_equity) ORDER BY x.ord),
    'c', jsonb_agg(round(x.total_cashflow) ORDER BY x.ord)
  )
  INTO final_result
  FROM unnest(result_data) WITH ORDINALITY
      AS x(snapshot_date, total_equity, total_cashflow, ord);

  RETURN final_result;
END;$$;


ALTER FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer DEFAULT 150) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
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
  -- VNI normalization anchor (first close in range)
  SELECT hp.close
  INTO v_first_vni_value
  FROM historical_prices hp
    JOIN assets a ON a.id = hp.asset_id
  WHERE a.ticker = '^VNINDEX'
    AND hp.date >= p_start_date
  ORDER BY hp.date
  LIMIT 1;

  -- Load dataset into memory array.
  -- Portfolio value is chain-linked from daily returns and rebased to 100.
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      100 * EXP(
        SUM(LN(1 + GREATEST(pd.intraday_return, -0.999999)))
          OVER (ORDER BY pd.snapshot_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      ) AS portfolio_value,
      (hp.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM daily_snapshots pd
      JOIN historical_prices hp ON pd.snapshot_date = hp.date
      JOIN assets a ON a.id = hp.asset_id
    WHERE pd.user_id = auth.uid()
      AND pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND a.ticker = '^VNINDEX'
      AND pd.intraday_return IS NOT NULL
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

  -- LTTB sampling (unchanged)
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
$$;


ALTER FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_dnse_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$BEGIN
  DECLARE
    v_user_id uuid;
    v_tax numeric;
    v_fee numeric;

  BEGIN
    -- Map broker account → internal user_id
    SELECT us.user_id
      INTO v_user_id
    FROM public.user_settings us
    WHERE us.dnse_account_id = NEW.account_no;

    -- Safety guard (important)
    IF v_user_id IS NULL THEN
      RAISE WARNING 'No user mapping found for account_no=%', NEW.account_no;
      RETURN NULL;
    END IF;

    -- Only process relevant statuses
    IF NEW.order_status IN ('Filled', 'DoneForDay', 'Canceled')
      AND COALESCE(NEW.fill_quantity, 0) > 0 THEN

      v_tax := 0;
      v_fee := 0;

      IF NEW.side = 'sell' THEN
        v_tax := 0.001 * NEW.average_price * NEW.fill_quantity;
        v_fee := 0.3 * NEW.fill_quantity;
      END IF;

      PERFORM public.add_stock_event(
        NEW.side,
        NEW.symbol,
        NEW.average_price,
        NEW.fill_quantity,
        v_fee,
        v_tax,
        v_user_id
      );

    END IF;

    RETURN NULL;
  END;
END;$$;


ALTER FUNCTION "public"."process_dnse_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_borrow"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  r public.tx_borrow%rowtype;
  v_cash_asset uuid;
  v_debt_asset uuid;
begin
  select * into r from public.tx_borrow where tx_id = p_tx_id;

  select id into v_cash_asset from public.assets where ticker = 'FX.VND';
  select id into v_debt_asset from public.assets where ticker = 'DEBTS';

  -- Clear any prior legs for this transaction
  delete from public.tx_legs where tx_id = p_tx_id;

  -- Debit cash (proceeds received)
  insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
  values (r.tx_id, v_cash_asset, r.principal, r.principal, 0);

  -- Credit debt (liability created)
  insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
  values (r.tx_id, v_debt_asset, r.principal, 0, r.principal);
end;
$$;


ALTER FUNCTION "public"."process_tx_borrow"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$DECLARE
  r tx_cashflow%rowtype;
  v_equity_asset uuid;
  v_user_id uuid;
  v_current_qty numeric;
  v_cost_change numeric;
  v_realized_pnl numeric;
  v_current_cost numeric;
BEGIN
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  -- Load transaction
  SELECT * INTO r FROM public.tx_cashflow WHERE tx_id = p_tx_id;

  -- Identify assets
  SELECT id INTO v_equity_asset FROM public.assets WHERE ticker = 'CAPITAL';

  -- Clear existing legs
  DELETE FROM public.tx_legs WHERE tx_id = p_tx_id;

  -- Handle by operation type
  IF r.operation IN ('deposit', 'income') THEN
    -- Debit cash asset
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, r.asset_id, r.quantity, r.net_proceed, 0);

    -- Credit equity (capital in)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, r.net_proceed, 0, r.net_proceed);

  ELSE -- Withdraw and expense operation

    -- Calculate current total cost & quantity
    SELECT SUM(l.debit) - SUM(l.credit), SUM(l.quantity)
    INTO v_current_cost, v_current_qty
    FROM public.tx_legs l
      JOIN public.tx_entries e ON l.tx_id = e.id
    WHERE l.asset_id = r.asset_id AND e.user_id = v_user_id;

    v_cost_change := r.quantity * v_current_cost / v_current_qty;
    v_realized_pnl := r.net_proceed - v_cost_change;

    -- Credit cash asset (reduce balance)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, r.asset_id, -r.quantity, 0, v_cost_change);

    -- Debit equity (capital out & possible gain/loss to equity)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (
      r.tx_id,
      v_equity_asset,
      -v_cost_change,
      r.net_proceed + GREATEST(-v_realized_pnl, 0),
      0 + GREATEST(v_realized_pnl, 0)
    );
  END IF;
END;$$;


ALTER FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_repay"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  r public.tx_repay%rowtype;
  v_cash_asset uuid;
  v_debt_asset uuid;
  v_equity_asset uuid;
begin
  select * into r from public.tx_repay where tx_id = p_tx_id;

  select id into v_cash_asset   from public.assets where ticker = 'FX.VND';
  select id into v_debt_asset   from public.assets where ticker = 'DEBTS';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';

  -- Clear any prior legs for this transaction
  delete from public.tx_legs where tx_id = p_tx_id;

  -- Credit cash (payment made)
  insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
  values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  -- Debit debt (liability reduced by principal)
  insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
  values (r.tx_id, v_debt_asset, -r.principal, r.principal, 0);

  -- Debit equity (interest expense)
  insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
  values (r.tx_id, v_equity_asset, -r.interest, r.interest, 0);
end;
$$;


ALTER FUNCTION "public"."process_tx_repay"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare
  r tx_stock%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_realized_pnl numeric;
  v_cost_change numeric;
  v_user_id uuid;
  v_current_cost numeric;
  v_current_qty numeric;
begin
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';

  -- Process transaction
  if r.operation = 'buy' then

    -- Debit stock (increase holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, r.stock_id, r.quantity, r.net_proceed, 0);

    -- Credit VND cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  else -- Sell side

    -- Calculate current total cost & quantity
    SELECT SUM(l.debit) - SUM(l.credit), SUM(l.quantity)
    INTO v_current_cost, v_current_qty
    FROM public.tx_legs l
      JOIN public.tx_entries e ON l.tx_id = e.id
    WHERE l.asset_id = r.stock_id AND e.user_id = v_user_id;

    v_cost_change := r.quantity * v_current_cost / v_current_qty;
    v_realized_pnl := r.net_proceed - v_cost_change;

    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit stock (reduce holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, r.stock_id, -r.quantity, 0, v_cost_change);

    -- Post gain/loss to equity
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (
      r.tx_id,
      v_equity_asset,
      v_realized_pnl,
      GREATEST(-v_realized_pnl, 0),
      GREATEST(v_realized_pnl, 0)
    );
  end if;
end;$$;


ALTER FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_ledger"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare
    tx record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;

    -- Step 2: replay all transactions in chronological order
    for tx in
        select id, category, created_at
        from public.tx_entries
        order by created_at asc
    loop
        case tx.category
            when 'stock'::tx_category then
                perform public.process_tx_stock(tx.id);

            when 'cashflow'::tx_category then
                perform public.process_tx_cashflow(tx.id);

            when 'borrow'::tx_category then
                perform public.process_tx_borrow(tx.id);

            when 'repay'::tx_category then
                perform public.process_tx_repay(tx.id);

            else
                raise exception 'Unhandled tx category: %', tx.category;
        end case;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;$$;


ALTER FUNCTION "public"."rebuild_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_daily_snapshots"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$begin
  refresh materialized view public.daily_snapshots;
  return null;
end;$$;


ALTER FUNCTION "public"."refresh_daily_snapshots"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_borrow"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.process_tx_borrow(new.tx_id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_process_tx_borrow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_cashflow"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$begin
    perform public.process_tx_cashflow(new.tx_id);
    return new;
end;$$;


ALTER FUNCTION "public"."trg_process_tx_cashflow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_repay"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.process_tx_repay(new.tx_id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_process_tx_repay"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$begin
    perform public.process_tx_stock(new.tx_id);
    return new;
end;$$;


ALTER FUNCTION "public"."trg_process_tx_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_historical_prices"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.historical_prices (asset_id, date, close)
  SELECT
    a.id,
    -- Use last_updated if available, fall back to bar_time
    (NEW.last_updated AT TIME ZONE 'UTC')::date,
    NEW.close * 1000
  FROM public.assets a
  WHERE a.ticker = NEW.symbol
  ON CONFLICT (asset_id, date)
  DO UPDATE SET
    close = EXCLUDED.close;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."upsert_historical_prices"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "flight"."aircrafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "icao_code" "text" NOT NULL,
    "model" "text"
);


ALTER TABLE "flight"."aircrafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "flight"."airlines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo" "text"
);


ALTER TABLE "flight"."airlines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "flight"."airports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iata_code" "text" NOT NULL,
    "icao_code" "text",
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "geom" "extensions"."geography"(Point,4326) GENERATED ALWAYS AS (("extensions"."st_setsrid"("extensions"."st_makepoint"("lng", "lat"), 4326))::"extensions"."geography") STORED,
    "timezone" "text" NOT NULL,
    CONSTRAINT "timezone_format_check" CHECK (("timezone" ~ '^[A-Za-z_]+/[A-Za-z_]+$'::"text"))
);


ALTER TABLE "flight"."airports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "flight"."flights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "airline_id" "uuid",
    "flight_number" "text",
    "departure_airport_id" "uuid" NOT NULL,
    "arrival_airport_id" "uuid" NOT NULL,
    "departure_time" timestamp with time zone,
    "arrival_time" timestamp with time zone,
    "seat" "text",
    "aircraft_id" "uuid",
    "notes" "text",
    "seat_type" "flight"."seat_type",
    "seat_position" "flight"."seat_position",
    "tail_number" "text",
    "user_id" "uuid"
);


ALTER TABLE "flight"."flights" OWNER TO "postgres";


CREATE OR REPLACE VIEW "flight"."routes_geojson" WITH ("security_invoker"='on') AS
 WITH "normalized" AS (
         SELECT LEAST("f"."departure_airport_id", "f"."arrival_airport_id") AS "airport_a_id",
            GREATEST("f"."departure_airport_id", "f"."arrival_airport_id") AS "airport_b_id",
            "f"."departure_airport_id",
            "f"."arrival_airport_id",
            "f"."flight_number",
            "al"."name" AS "airline_name"
           FROM ("flight"."flights" "f"
             LEFT JOIN "flight"."airlines" "al" ON (("al"."id" = "f"."airline_id")))
        ), "route_frequency_cte" AS (
         SELECT "normalized"."airport_a_id",
            "normalized"."airport_b_id",
            "count"(*) AS "route_frequency"
           FROM "normalized"
          GROUP BY "normalized"."airport_a_id", "normalized"."airport_b_id"
        ), "direction_airline_grouped" AS (
         SELECT "n"."airport_a_id",
            "n"."airport_b_id",
                CASE
                    WHEN ("n"."departure_airport_id" = "n"."airport_a_id") THEN (("a_1"."iata_code" || ' → '::"text") || "b_1"."iata_code")
                    ELSE (("b_1"."iata_code" || ' → '::"text") || "a_1"."iata_code")
                END AS "direction_label",
            "n"."airline_name",
            "array_agg"(DISTINCT "n"."flight_number" ORDER BY "n"."flight_number") FILTER (WHERE ("n"."flight_number" IS NOT NULL)) AS "flight_numbers"
           FROM (("normalized" "n"
             JOIN "flight"."airports" "a_1" ON (("a_1"."id" = "n"."airport_a_id")))
             JOIN "flight"."airports" "b_1" ON (("b_1"."id" = "n"."airport_b_id")))
          GROUP BY "n"."airport_a_id", "n"."airport_b_id",
                CASE
                    WHEN ("n"."departure_airport_id" = "n"."airport_a_id") THEN (("a_1"."iata_code" || ' → '::"text") || "b_1"."iata_code")
                    ELSE (("b_1"."iata_code" || ' → '::"text") || "a_1"."iata_code")
                END, "n"."airline_name"
        ), "direction_grouped" AS (
         SELECT "direction_airline_grouped"."airport_a_id",
            "direction_airline_grouped"."airport_b_id",
            "direction_airline_grouped"."direction_label",
            "jsonb_object_agg"("direction_airline_grouped"."airline_name", "direction_airline_grouped"."flight_numbers") AS "airlines"
           FROM "direction_airline_grouped"
          WHERE ("direction_airline_grouped"."airline_name" IS NOT NULL)
          GROUP BY "direction_airline_grouped"."airport_a_id", "direction_airline_grouped"."airport_b_id", "direction_airline_grouped"."direction_label"
        ), "flights_json" AS (
         SELECT "direction_grouped"."airport_a_id",
            "direction_grouped"."airport_b_id",
            "jsonb_object_agg"("direction_grouped"."direction_label", "direction_grouped"."airlines") AS "flights_by_direction"
           FROM "direction_grouped"
          GROUP BY "direction_grouped"."airport_a_id", "direction_grouped"."airport_b_id"
        )
 SELECT "gen_random_uuid"() AS "id",
    "a"."id" AS "airport_a_id",
    "b"."id" AS "airport_b_id",
    "a"."iata_code" AS "airport_a_iata",
    "b"."iata_code" AS "airport_b_iata",
    "a"."name" AS "airport_a_name",
    "b"."name" AS "airport_b_name",
    "a"."city" AS "airport_a_city",
    "b"."city" AS "airport_b_city",
    "a"."country" AS "airport_a_country",
    "b"."country" AS "airport_b_country",
    "rf"."route_frequency",
    "fj"."flights_by_direction",
    "round"((("extensions"."st_distance"("a"."geom", "b"."geom"))::numeric / (1000)::numeric), 1) AS "distance_km",
    ("extensions"."st_asgeojson"("extensions"."st_makeline"(("a"."geom")::"extensions"."geometry", ("b"."geom")::"extensions"."geometry")))::json AS "geometry"
   FROM ((("route_frequency_cte" "rf"
     JOIN "flights_json" "fj" ON ((("fj"."airport_a_id" = "rf"."airport_a_id") AND ("fj"."airport_b_id" = "rf"."airport_b_id"))))
     JOIN "flight"."airports" "a" ON (("a"."id" = "rf"."airport_a_id")))
     JOIN "flight"."airports" "b" ON (("b"."id" = "rf"."airport_b_id")));


ALTER VIEW "flight"."routes_geojson" OWNER TO "postgres";


CREATE OR REPLACE VIEW "flight"."flights_readable" WITH ("security_invoker"='on') AS
 SELECT "f"."user_id",
    "f"."flight_number",
    "f"."tail_number",
    "f"."departure_time",
    "f"."arrival_time",
    "dep"."iata_code" AS "departure_airport_code",
    "arr"."iata_code" AS "arrival_airport_code",
    "dep"."name" AS "departure_airport_name",
    "arr"."name" AS "arrival_airport_name",
    "al"."name" AS "airline_name",
    "al"."logo" AS "airline_logo",
    "ac"."model" AS "aircraft_model",
    "f"."seat",
    "f"."seat_type",
    "f"."seat_position",
    "r"."distance_km",
    "concat"("floor"((EXTRACT(epoch FROM ("f"."arrival_time" - "f"."departure_time")) / (3600)::numeric)), 'h ', "floor"(((EXTRACT(epoch FROM ("f"."arrival_time" - "f"."departure_time")) % (3600)::numeric) / (60)::numeric)), 'm') AS "duration"
   FROM ((((("flight"."flights" "f"
     LEFT JOIN "flight"."airlines" "al" ON (("al"."id" = "f"."airline_id")))
     LEFT JOIN "flight"."aircrafts" "ac" ON (("ac"."id" = "f"."aircraft_id")))
     LEFT JOIN "flight"."airports" "dep" ON (("dep"."id" = "f"."departure_airport_id")))
     LEFT JOIN "flight"."airports" "arr" ON (("arr"."id" = "f"."arrival_airport_id")))
     LEFT JOIN "flight"."routes_geojson" "r" ON ((("r"."airport_a_id" = LEAST("f"."departure_airport_id", "f"."arrival_airport_id")) AND ("r"."airport_b_id" = GREATEST("f"."departure_airport_id", "f"."arrival_airport_id")))))
  ORDER BY "f"."departure_time" DESC;


ALTER VIEW "flight"."flights_readable" OWNER TO "postgres";


CREATE OR REPLACE VIEW "flight"."lifetime_stats" WITH ("security_invoker"='on') AS
 WITH "visited_airports" AS (
         SELECT "flights"."user_id",
            "flights"."departure_airport_id" AS "airport_id"
           FROM "flight"."flights"
        UNION
         SELECT "flights"."user_id",
            "flights"."arrival_airport_id"
           FROM "flight"."flights"
        )
 SELECT "f"."user_id",
    "f"."flights_count",
    "count"(DISTINCT "va"."airport_id") AS "airports_count",
    "count"(DISTINCT "a"."country") AS "country_count",
    "f"."airframe_count",
    "f"."total_distance",
    "f"."total_duration"
   FROM ((( SELECT "flights_readable"."user_id",
            "count"(*) AS "flights_count",
            "count"(DISTINCT "flights_readable"."aircraft_model") AS "airframe_count",
            "sum"("flights_readable"."distance_km") AS "total_distance",
            ("round"((EXTRACT(epoch FROM "sum"(("flights_readable"."arrival_time" - "flights_readable"."departure_time"))) / (3600)::numeric), 1) || ' hours'::"text") AS "total_duration"
           FROM "flight"."flights_readable"
          GROUP BY "flights_readable"."user_id") "f"
     LEFT JOIN "visited_airports" "va" ON (("va"."user_id" = "f"."user_id")))
     LEFT JOIN "flight"."airports" "a" ON (("a"."id" = "va"."airport_id")))
  GROUP BY "f"."user_id", "f"."flights_count", "f"."airframe_count", "f"."total_distance", "f"."total_duration";


ALTER VIEW "flight"."lifetime_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" "text" NOT NULL,
    "logo_url" "text"
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historical_fxrate" (
    "currency_code" "text" NOT NULL,
    "date" "date" NOT NULL,
    "rate" numeric(14,2) NOT NULL
);


ALTER TABLE "public"."historical_fxrate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historical_prices" (
    "asset_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "close" numeric NOT NULL
);


ALTER TABLE "public"."historical_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_borrow" (
    "tx_id" "uuid" NOT NULL,
    "lender" "text" NOT NULL,
    "principal" numeric NOT NULL,
    "rate" numeric NOT NULL
);


ALTER TABLE "public"."tx_borrow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "public"."tx_category" NOT NULL,
    "memo" "text" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tx_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_repay" (
    "tx_id" "uuid" NOT NULL,
    "borrow_tx" "uuid" NOT NULL,
    "principal" numeric NOT NULL,
    "interest" numeric NOT NULL,
    "net_proceed" numeric GENERATED ALWAYS AS (("principal" + "interest")) STORED NOT NULL
);


ALTER TABLE "public"."tx_repay" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."outstanding_debts" WITH ("security_invoker"='true') AS
 SELECT "b"."tx_id",
    "b"."lender",
    "b"."principal",
    "b"."rate",
    "round"((("b"."principal" * "power"(((1)::numeric + (("b"."rate" / 100.0) / 365.0)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "e"."created_at")))) - "b"."principal"), 0) AS "accrued_interest",
    "e"."created_at"
   FROM ("public"."tx_borrow" "b"
     JOIN "public"."tx_entries" "e" ON ((("e"."id" = "b"."tx_id") AND ("e"."user_id" = "auth"."uid"()))))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."tx_repay" "r"
          WHERE ("r"."borrow_tx" = "b"."tx_id"))));


ALTER VIEW "public"."outstanding_debts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_legs" (
    "tx_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(18,2) NOT NULL,
    "debit" numeric(16,0) NOT NULL,
    "credit" numeric(16,0) NOT NULL
);


ALTER TABLE "public"."tx_legs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."balance_sheet" WITH ("security_invoker"='true') AS
 WITH "user_legs" AS (
         SELECT "tl"."tx_id",
            "tl"."asset_id",
            "tl"."quantity",
            "tl"."debit",
            "tl"."credit"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "tl"."tx_id")))
          WHERE ("e"."user_id" = "auth"."uid"())
        ), "debt_interest" AS (
         SELECT "sum"("outstanding_debts"."accrued_interest") AS "sum"
           FROM "public"."outstanding_debts"
        )
 SELECT "a"."ticker",
    "a"."name",
    "a"."asset_class",
    "a"."logo_url",
    "a"."currency_code",
    COALESCE("sum"("ul"."quantity"), (0)::numeric) AS "quantity",
    COALESCE(("sum"("ul"."debit") - "sum"("ul"."credit")), (0)::numeric) AS "cost_basis",
        CASE
            WHEN ("a"."asset_class" = ANY (ARRAY['stock'::"public"."asset_class", 'fund'::"public"."asset_class"])) THEN "round"("sum"(("ul"."quantity" * COALESCE("sp"."price", "er"."rate"))), 0)
            WHEN ("a"."ticker" = 'INTERESTS'::"text") THEN ( SELECT "sum"("outstanding_debts"."accrued_interest") AS "sum"
               FROM "public"."outstanding_debts")
            ELSE "sum"("ul"."quantity")
        END AS "total_value",
    COALESCE(COALESCE("sp"."price", "er"."rate"), (0)::numeric) AS "mkt_price",
    COALESCE(
        CASE
            WHEN ("a"."ticker" = 'INTERESTS'::"text") THEN (- ( SELECT "sum"("outstanding_debts"."accrued_interest") AS "sum"
               FROM "public"."outstanding_debts"))
            ELSE "round"(("sum"(("ul"."quantity" * COALESCE("sp"."price", "er"."rate"))) - ("sum"("ul"."debit") - "sum"("ul"."credit"))), 0)
        END, (0)::numeric) AS "net_profit"
   FROM ((("public"."assets" "a"
     LEFT JOIN "user_legs" "ul" ON (("a"."id" = "ul"."asset_id")))
     LEFT JOIN LATERAL ( SELECT ("hp"."close" * (1000)::numeric) AS "price"
           FROM "public"."historical_prices" "hp"
          WHERE ("hp"."asset_id" = "a"."id")
          ORDER BY "hp"."date" DESC
         LIMIT 1) "sp" ON (true))
     LEFT JOIN LATERAL ( SELECT "hfx"."rate"
           FROM "public"."historical_fxrate" "hfx"
          WHERE ("hfx"."currency_code" = "a"."currency_code")
          ORDER BY "hfx"."date" DESC
         LIMIT 1) "er" ON (true))
  GROUP BY "a"."ticker", "a"."name", "a"."logo_url", "a"."currency_code", "a"."asset_class", "sp"."price", "er"."rate"
 HAVING (("abs"("sum"("ul"."quantity")) > (0)::numeric) OR ("a"."ticker" = 'INTERESTS'::"text"))
  ORDER BY "a"."asset_class";


ALTER VIEW "public"."balance_sheet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_cashflow" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "operation" "public"."cashflow_ops" NOT NULL,
    "quantity" numeric(18,2) NOT NULL,
    "fx_rate" numeric DEFAULT 1 NOT NULL,
    "net_proceed" numeric(16,0) GENERATED ALWAYS AS (("quantity" * "fx_rate")) STORED NOT NULL
);


ALTER TABLE "public"."tx_cashflow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_stock" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stock_id" "uuid" NOT NULL,
    "price" numeric(16,0) DEFAULT 0 NOT NULL,
    "quantity" numeric(16,0) NOT NULL,
    "fee" numeric(16,0) NOT NULL,
    "tax" numeric(16,0) DEFAULT 0 NOT NULL,
    "operation" "public"."stock_ops" NOT NULL,
    "net_proceed" numeric GENERATED ALWAYS AS (
CASE
    WHEN ("operation" = 'buy'::"public"."stock_ops") THEN ((("price" * "quantity") + "fee") + "tax")
    WHEN ("operation" = 'sell'::"public"."stock_ops") THEN ((("price" * "quantity") - "fee") - "tax")
    ELSE (0)::numeric
END) STORED NOT NULL
);


ALTER TABLE "public"."tx_stock" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."daily_snapshots" AS
 WITH "users" AS (
         SELECT "tx_entries"."user_id",
            ("min"("tx_entries"."created_at"))::"date" AS "start_date"
           FROM "public"."tx_entries"
          WHERE ("tx_entries"."user_id" IS NOT NULL)
          GROUP BY "tx_entries"."user_id"
        ), "user_days" AS (
         SELECT "u"."user_id",
            ("gs"."d")::"date" AS "snapshot_date"
           FROM ("users" "u"
             CROSS JOIN LATERAL "generate_series"(("u"."start_date")::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval) "gs"("d"))
          WHERE (EXTRACT(isodow FROM "gs"."d") <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), "daily_deltas" AS (
         SELECT "e"."user_id",
            ("e"."created_at")::"date" AS "activity_date",
            "tl"."asset_id",
            "a"."currency_code",
            "sum"("tl"."quantity") AS "dq"
           FROM (("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
          WHERE ("a"."asset_class" <> ALL (ARRAY['equity'::"public"."asset_class", 'liability'::"public"."asset_class"]))
          GROUP BY "e"."user_id", (("e"."created_at")::"date"), "tl"."asset_id", "a"."currency_code"
        ), "asset_intervals" AS (
         SELECT "daily_deltas"."user_id",
            "daily_deltas"."asset_id",
            "daily_deltas"."currency_code",
            "sum"("daily_deltas"."dq") OVER (PARTITION BY "daily_deltas"."user_id", "daily_deltas"."asset_id", "daily_deltas"."currency_code" ORDER BY "daily_deltas"."activity_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "cum_qty",
            "daily_deltas"."activity_date" AS "valid_from",
            COALESCE("lead"("daily_deltas"."activity_date") OVER (PARTITION BY "daily_deltas"."user_id", "daily_deltas"."asset_id", "daily_deltas"."currency_code" ORDER BY "daily_deltas"."activity_date"), 'infinity'::"date") AS "valid_to"
           FROM "daily_deltas"
        ), "positions" AS (
         SELECT ("gs"."d")::"date" AS "snapshot_date",
            "ai"."user_id",
            "ai"."asset_id",
            "ai"."currency_code",
            "ai"."cum_qty" AS "quantity"
           FROM ("asset_intervals" "ai"
             CROSS JOIN LATERAL "generate_series"(("ai"."valid_from")::timestamp without time zone, (LEAST(("ai"."valid_to" - 1), CURRENT_DATE))::timestamp without time zone, '1 day'::interval) "gs"("d"))
          WHERE (EXTRACT(isodow FROM "gs"."d") <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), "total_assets_per_day" AS (
         SELECT "pos"."user_id",
            "pos"."snapshot_date",
            COALESCE("sum"((("pos"."quantity" * COALESCE("pr"."price", (1)::numeric)) * COALESCE("fx"."rate", (1)::numeric))), (0)::numeric) AS "total_assets"
           FROM (("positions" "pos"
             LEFT JOIN LATERAL ( SELECT ("hp"."close" * (1000)::numeric) AS "price"
                   FROM "public"."historical_prices" "hp"
                  WHERE (("hp"."asset_id" = "pos"."asset_id") AND ("hp"."date" <= "pos"."snapshot_date"))
                  ORDER BY "hp"."date" DESC
                 LIMIT 1) "pr" ON (true))
             LEFT JOIN LATERAL ( SELECT "hf"."rate"
                   FROM "public"."historical_fxrate" "hf"
                  WHERE (("hf"."currency_code" = "pos"."currency_code") AND ("hf"."date" <= "pos"."snapshot_date"))
                  ORDER BY "hf"."date" DESC
                 LIMIT 1) "fx" ON (true))
          GROUP BY "pos"."user_id", "pos"."snapshot_date"
        ), "debt_events" AS (
         SELECT "e_b"."user_id",
            "b_1"."tx_id" AS "borrow_tx_id",
            "b_1"."principal",
            "b_1"."rate",
            ("e_b"."created_at")::"date" AS "borrow_date",
            ("e_r"."created_at")::"date" AS "repay_date"
           FROM ((("public"."tx_borrow" "b_1"
             JOIN "public"."tx_entries" "e_b" ON (("e_b"."id" = "b_1"."tx_id")))
             LEFT JOIN "public"."tx_repay" "r" ON (("r"."borrow_tx" = "b_1"."tx_id")))
             LEFT JOIN "public"."tx_entries" "e_r" ON (("e_r"."id" = "r"."tx_id")))
        ), "debt_balances_by_day" AS (
         SELECT "d"."snapshot_date",
            "de"."user_id",
            "de"."borrow_tx_id",
            "de"."principal",
            "de"."rate",
            "de"."borrow_date",
            "de"."repay_date",
                CASE
                    WHEN (("de"."repay_date" IS NOT NULL) AND ("de"."repay_date" <= "d"."snapshot_date")) THEN (0)::numeric
                    ELSE ("de"."principal" * "power"(((1)::numeric + (("de"."rate" / 100.0) / 365.0)), (GREATEST(("d"."snapshot_date" - "de"."borrow_date"), 0))::numeric))
                END AS "balance_at_date"
           FROM ("debt_events" "de"
             JOIN "user_days" "d" ON (("d"."user_id" = "de"."user_id")))
          WHERE ("de"."borrow_date" <= "d"."snapshot_date")
        ), "total_liabilities_per_day" AS (
         SELECT "debt_balances_by_day"."user_id",
            "debt_balances_by_day"."snapshot_date",
            COALESCE("sum"("debt_balances_by_day"."balance_at_date"), (0)::numeric) AS "total_liabilities"
           FROM "debt_balances_by_day"
          GROUP BY "debt_balances_by_day"."user_id", "debt_balances_by_day"."snapshot_date"
        ), "cashflow_per_day" AS (
         SELECT "e"."user_id",
            ("e"."created_at")::"date" AS "snapshot_date",
            COALESCE(("sum"("tl"."credit") - "sum"("tl"."debit")), (0)::numeric) AS "intraday_cashflow"
           FROM ((("public"."tx_entries" "e"
             JOIN "public"."tx_legs" "tl" ON (("tl"."tx_id" = "e"."id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
             JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "e"."id")))
          WHERE (("cf"."operation" = ANY (ARRAY['deposit'::"public"."cashflow_ops", 'withdraw'::"public"."cashflow_ops"])) AND ("a"."asset_class" = 'equity'::"public"."asset_class"))
          GROUP BY "e"."user_id", (("e"."created_at")::"date")
        ), "tax_fee_per_day" AS (
         SELECT "e"."user_id",
            ("e"."created_at")::"date" AS "snapshot_date",
            (COALESCE("sum"("s"."fee"), (0)::numeric) + COALESCE("sum"("cf"."net_proceed") FILTER (WHERE ("e"."memo" = 'Operational fees'::"text")), (0)::numeric)) AS "total_fees",
            COALESCE("sum"("s"."tax"), (0)::numeric) AS "total_taxes",
            COALESCE("sum"("r"."interest"), (0)::numeric) AS "loan_interest",
            COALESCE("sum"("cf"."net_proceed") FILTER (WHERE ("e"."memo" = ANY (ARRAY['Margin interest'::"text", 'Cash advance interest'::"text"]))), (0)::numeric) AS "margin_interest"
           FROM ((("public"."tx_entries" "e"
             LEFT JOIN "public"."tx_repay" "r" ON (("r"."tx_id" = "e"."id")))
             LEFT JOIN "public"."tx_stock" "s" ON (("s"."tx_id" = "e"."id")))
             LEFT JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "e"."id")))
          GROUP BY "e"."user_id", (("e"."created_at")::"date")
        ), "base" AS (
         SELECT "d"."snapshot_date",
            "d"."user_id",
            COALESCE("nc"."intraday_cashflow", (0)::numeric) AS "intraday_cashflow",
            "round"(("tad"."total_assets" - "tld"."total_liabilities")) AS "total_equity",
            COALESCE("tf"."total_fees", (0)::numeric) AS "intraday_fee",
            COALESCE("tf"."total_taxes", (0)::numeric) AS "intraday_tax",
            COALESCE(("tf"."loan_interest" + "tf"."margin_interest"), (0)::numeric) AS "intraday_interest"
           FROM (((("user_days" "d"
             LEFT JOIN "total_assets_per_day" "tad" ON ((("tad"."snapshot_date" = "d"."snapshot_date") AND ("tad"."user_id" = "d"."user_id"))))
             LEFT JOIN "total_liabilities_per_day" "tld" ON ((("tld"."snapshot_date" = "d"."snapshot_date") AND ("tld"."user_id" = "d"."user_id"))))
             LEFT JOIN "cashflow_per_day" "nc" ON ((("nc"."snapshot_date" = "d"."snapshot_date") AND ("nc"."user_id" = "d"."user_id"))))
             LEFT JOIN "tax_fee_per_day" "tf" ON ((("tf"."snapshot_date" = "d"."snapshot_date") AND ("tf"."user_id" = "d"."user_id"))))
        )
 SELECT "snapshot_date",
    "user_id",
    "total_equity",
    "intraday_cashflow",
    "intraday_fee",
    "intraday_tax",
    "intraday_interest",
    "round"("sum"("intraday_cashflow") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS "total_cashflow",
        CASE
            WHEN ("lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date") IS NULL) THEN (0)::numeric
            WHEN ("lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date") = (0)::numeric) THEN (0)::numeric
            ELSE (("total_equity" - "intraday_cashflow") - "lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date"))
        END AS "intraday_pnl",
        CASE
            WHEN ("lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date") IS NULL) THEN (0)::numeric
            WHEN ("lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date") = (0)::numeric) THEN (0)::numeric
            ELSE ((("total_equity" - "intraday_cashflow") - "lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date")) / NULLIF("lag"("total_equity") OVER (PARTITION BY "user_id" ORDER BY "snapshot_date"), (0)::numeric))
        END AS "intraday_return"
   FROM "base" "b"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."daily_snapshots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."benchmark_all" WITH ("security_invoker"='true') AS
 WITH "vnindex" AS (
         SELECT "assets"."id"
           FROM "public"."assets"
          WHERE ("assets"."ticker" = '^VNINDEX'::"text")
        ), "date_bound" AS (
         SELECT "min"("daily_snapshots"."snapshot_date") AS "first_date",
            "max"("daily_snapshots"."snapshot_date") AS "last_date"
           FROM "public"."daily_snapshots"
        )
 SELECT "public"."get_return_chart"("db"."first_date", "db"."last_date") AS "return_chart",
    "round"("public"."calculate_twr"("db"."first_date", "db"."last_date"), 3) AS "equity_ret",
    "round"((("hp_last"."close" / "hp_first"."close") - (1)::numeric), 3) AS "vn_ret"
   FROM ((("date_bound" "db"
     CROSS JOIN "vnindex" "v")
     LEFT JOIN LATERAL ( SELECT "hp"."date",
            "hp"."close"
           FROM "public"."historical_prices" "hp"
          WHERE ("hp"."asset_id" = "v"."id")
          ORDER BY ("hp"."date" < "db"."first_date") DESC,
                CASE
                    WHEN ("hp"."date" < "db"."first_date") THEN "hp"."date"
                    ELSE NULL::"date"
                END DESC, "hp"."date"
         LIMIT 1) "hp_first" ON (true))
     LEFT JOIN LATERAL ( SELECT "hp"."date",
            "hp"."close"
           FROM "public"."historical_prices" "hp"
          WHERE (("hp"."asset_id" = "v"."id") AND ("hp"."date" = "db"."last_date"))
         LIMIT 1) "hp_last" ON (true));


ALTER VIEW "public"."benchmark_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "dnse_account_id" "text",
    "inception_date" "date" DEFAULT '2020-01-01'::"date" NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."benchmark_rollings" WITH ("security_invoker"='true') AS
 WITH "periods" AS (
         SELECT CURRENT_DATE AS "today",
            ("date_trunc"('year'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "ytd_date",
            ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "mtd_date",
            ( SELECT "us"."inception_date"
                   FROM "public"."user_settings" "us"
                  WHERE ("us"."user_id" = "auth"."uid"())) AS "inception_date",
            ((CURRENT_DATE - '3 mons'::interval))::"date" AS "last3m_date",
            ((CURRENT_DATE - '6 mons'::interval))::"date" AS "last6m_date",
            ((CURRENT_DATE - '1 year'::interval))::"date" AS "last1y_date"
        ), "metrics" AS (
         SELECT "round"("public"."calculate_twr"("periods"."ytd_date", "periods"."today"), 3) AS "twr_ytd",
            "round"("public"."calculate_twr"("periods"."inception_date", "periods"."today"), 3) AS "twr_all",
            "periods"."today",
            "periods"."inception_date"
           FROM "periods"
        )
 SELECT "m"."twr_ytd",
    "m"."twr_all",
        CASE
            WHEN (("m"."today" > "m"."inception_date") AND ("m"."inception_date" IS NOT NULL)) THEN "round"(("power"(((1)::numeric + "m"."twr_all"), (1.0 / ((("m"."today" - "m"."inception_date"))::numeric / 365.25))) - (1)::numeric), 3)
            ELSE NULL::numeric
        END AS "cagr",
    "rc"."returnchart"
   FROM ("metrics" "m"
     CROSS JOIN LATERAL ( SELECT "jsonb_build_object"('last_3m', "public"."get_return_chart"("p"."last3m_date", "p"."today"), 'last_6m', "public"."get_return_chart"("p"."last6m_date", "p"."today"), 'last_1y', "public"."get_return_chart"("p"."last1y_date", "p"."today"), 'all', "public"."get_return_chart"("p"."inception_date", "p"."today")) AS "returnchart"
           FROM "periods" "p") "rc");


ALTER VIEW "public"."benchmark_rollings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."benchmark_yearly" WITH ("security_invoker"='true') AS
 WITH "vnindex" AS (
         SELECT "assets"."id"
           FROM "public"."assets"
          WHERE ("assets"."ticker" = '^VNINDEX'::"text")
        ), "date_bound" AS (
         SELECT "ds"."year",
            "min"("ds"."snapshot_date") AS "first_date",
            "max"("ds"."snapshot_date") AS "last_date"
           FROM ( SELECT "daily_snapshots"."snapshot_date",
                    EXTRACT(year FROM "daily_snapshots"."snapshot_date") AS "year"
                   FROM "public"."daily_snapshots") "ds"
          GROUP BY "ds"."year"
        )
 SELECT "db"."year",
    "public"."get_return_chart"("db"."first_date", "db"."last_date") AS "return_chart",
    "round"("public"."calculate_twr"("db"."first_date", "db"."last_date"), 3) AS "equity_ret",
    "round"((("hp_last"."close" / "hp_first"."close") - (1)::numeric), 3) AS "vn_ret"
   FROM ((("date_bound" "db"
     CROSS JOIN "vnindex" "v")
     LEFT JOIN LATERAL ( SELECT "hp"."date",
            "hp"."close"
           FROM "public"."historical_prices" "hp"
          WHERE ("hp"."asset_id" = "v"."id")
          ORDER BY ("hp"."date" < "db"."first_date") DESC,
                CASE
                    WHEN ("hp"."date" < "db"."first_date") THEN "hp"."date"
                    ELSE NULL::"date"
                END DESC, "hp"."date"
         LIMIT 1) "hp_first" ON (true))
     LEFT JOIN LATERAL ( SELECT "hp"."date",
            "hp"."close"
           FROM "public"."historical_prices" "hp"
          WHERE (("hp"."asset_id" = "v"."id") AND ("hp"."date" = "db"."last_date"))
         LIMIT 1) "hp_last" ON (true))
  ORDER BY "db"."year";


ALTER VIEW "public"."benchmark_yearly" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cashflow_all" WITH ("security_invoker"='true') AS
 SELECT "sum"(GREATEST("intraday_cashflow", (0)::numeric)) AS "deposits",
    "sum"(LEAST("intraday_cashflow", (0)::numeric)) AS "withdrawals"
   FROM "public"."daily_snapshots"
  WHERE ("user_id" = "auth"."uid"());


ALTER VIEW "public"."cashflow_all" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cashflow_yearly" WITH ("security_invoker"='true') AS
 SELECT EXTRACT(year FROM "snapshot_date") AS "year",
    "sum"(GREATEST("intraday_cashflow", (0)::numeric)) AS "deposits",
    "sum"(LEAST("intraday_cashflow", (0)::numeric)) AS "withdrawals"
   FROM "public"."daily_snapshots"
  WHERE ("user_id" = "auth"."uid"())
  GROUP BY (EXTRACT(year FROM "snapshot_date"))
  ORDER BY (EXTRACT(year FROM "snapshot_date"));


ALTER VIEW "public"."cashflow_yearly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnse_m1_close" (
    "symbol" "text" NOT NULL,
    "close" numeric NOT NULL,
    "volume" bigint NOT NULL,
    "last_updated" timestamp with time zone NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dnse_m1_close" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnse_order_events" (
    "id" integer NOT NULL,
    "side" "public"."stock_ops" NOT NULL,
    "account_no" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "order_type" "text" NOT NULL,
    "price" numeric NOT NULL,
    "quantity" integer NOT NULL,
    "fill_quantity" integer DEFAULT 0 NOT NULL,
    "canceled_quantity" integer DEFAULT 0 NOT NULL,
    "leave_quantity" integer DEFAULT 0 NOT NULL,
    "order_status" "public"."dnse_order_status" NOT NULL,
    "loan_package_id" integer,
    "modified_date" timestamp with time zone NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avg_price" numeric
);


ALTER TABLE "public"."dnse_order_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."equity_rollings" WITH ("security_invoker"='true') AS
 WITH "periods" AS (
         SELECT CURRENT_DATE AS "today",
            ("date_trunc"('year'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "ytd_date",
            ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "mtd_date",
            ( SELECT "us"."inception_date"
                   FROM "public"."user_settings" "us"
                  WHERE ("us"."user_id" = "auth"."uid"())) AS "inception_date",
            ((CURRENT_DATE - '3 mons'::interval))::"date" AS "last3m_date",
            ((CURRENT_DATE - '6 mons'::interval))::"date" AS "last6m_date",
            ((CURRENT_DATE - '1 year'::interval))::"date" AS "last1y_date"
        ), "metrics" AS (
         SELECT "public"."calculate_pnl"("periods"."ytd_date", "periods"."today") AS "pnl_ytd",
            "public"."calculate_pnl"("periods"."mtd_date", "periods"."today") AS "pnl_mtd",
            "periods"."today",
            "periods"."inception_date"
           FROM "periods"
        )
 SELECT "m"."pnl_ytd",
    "m"."pnl_mtd",
    "b"."total_equity",
    "ec"."equitychart"
   FROM (("metrics" "m"
     CROSS JOIN LATERAL ( SELECT "daily_snapshots"."total_equity"
           FROM "public"."daily_snapshots"
          WHERE ("daily_snapshots"."user_id" = "auth"."uid"())
          ORDER BY "daily_snapshots"."snapshot_date" DESC
         LIMIT 1) "b")
     CROSS JOIN LATERAL ( SELECT "jsonb_build_object"('last_3m', "public"."get_equity_chart"("p"."last3m_date", "p"."today"), 'last_6m', "public"."get_equity_chart"("p"."last6m_date", "p"."today"), 'last_1y', "public"."get_equity_chart"("p"."last1y_date", "p"."today"), 'all', "public"."get_equity_chart"("p"."inception_date", "p"."today")) AS "equitychart"
           FROM "periods" "p") "ec");


ALTER VIEW "public"."equity_rollings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "source" "text" NOT NULL,
    "published_at" timestamp with time zone,
    "excerpt" "text",
    "related_stocks" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pnl_expense_all" WITH ("security_invoker"='true') AS
 SELECT "round"("sum"("pnl")) AS "total_pnl",
    "round"("avg"("pnl")) AS "avg_profit",
    (- "round"("avg"(((COALESCE("interest", (0)::numeric) + COALESCE("tax", (0)::numeric)) + COALESCE("fee", (0)::numeric))))) AS "avg_expense",
    "jsonb_build_object"('snapshot_date', "jsonb_agg"(("snapshot_date")::"text" ORDER BY "snapshot_date"), 'revenue', "jsonb_agg"((((COALESCE("pnl", (0)::numeric) + COALESCE("fee", (0)::numeric)) + COALESCE("interest", (0)::numeric)) + COALESCE("tax", (0)::numeric)) ORDER BY "snapshot_date"), 'fee', "jsonb_agg"(COALESCE((- "fee"), (0)::numeric) ORDER BY "snapshot_date"), 'interest', "jsonb_agg"(COALESCE((- "interest"), (0)::numeric) ORDER BY "snapshot_date"), 'tax', "jsonb_agg"(COALESCE((- "tax"), (0)::numeric) ORDER BY "snapshot_date")) AS "profit_chart"
   FROM ( SELECT ("date_trunc"('year'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date" AS "snapshot_date",
            "sum"("ds"."intraday_pnl") AS "pnl",
            "sum"("ds"."intraday_interest") AS "interest",
            "sum"("ds"."intraday_tax") AS "tax",
            "sum"("ds"."intraday_fee") AS "fee"
           FROM "public"."daily_snapshots" "ds"
          WHERE ("ds"."user_id" = "auth"."uid"())
          GROUP BY (("date_trunc"('year'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date")) "yearly";


ALTER VIEW "public"."pnl_expense_all" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pnl_expense_last1y" WITH ("security_invoker"='true') AS
 SELECT "round"("sum"("pnl")) AS "total_pnl",
    "round"("avg"("pnl")) AS "avg_profit",
    (- "round"("avg"(((COALESCE("interest", (0)::numeric) + COALESCE("tax", (0)::numeric)) + COALESCE("fee", (0)::numeric))))) AS "avg_expense",
    "jsonb_build_object"('snapshot_date', "jsonb_agg"(("snapshot_date")::"text" ORDER BY "snapshot_date"), 'revenue', "jsonb_agg"((((COALESCE("pnl", (0)::numeric) + COALESCE("fee", (0)::numeric)) + COALESCE("interest", (0)::numeric)) + COALESCE("tax", (0)::numeric)) ORDER BY "snapshot_date"), 'fee', "jsonb_agg"(COALESCE((- "fee"), (0)::numeric) ORDER BY "snapshot_date"), 'interest', "jsonb_agg"(COALESCE((- "interest"), (0)::numeric) ORDER BY "snapshot_date"), 'tax', "jsonb_agg"(COALESCE((- "tax"), (0)::numeric) ORDER BY "snapshot_date")) AS "profit_chart"
   FROM ( SELECT ("date_trunc"('month'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date" AS "snapshot_date",
            "sum"("ds"."intraday_pnl") AS "pnl",
            "sum"("ds"."intraday_interest") AS "interest",
            "sum"("ds"."intraday_tax") AS "tax",
            "sum"("ds"."intraday_fee") AS "fee"
           FROM "public"."daily_snapshots" "ds"
          WHERE ("ds"."user_id" = "auth"."uid"())
          GROUP BY (("date_trunc"('month'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date")
          ORDER BY (("date_trunc"('month'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date") DESC
         LIMIT 12) "ms";


ALTER VIEW "public"."pnl_expense_last1y" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pnl_expense_yearly" WITH ("security_invoker"='true') AS
 SELECT (EXTRACT(year FROM "snapshot_date"))::integer AS "year",
    "round"("sum"("pnl")) AS "total_pnl",
    "round"("avg"("pnl")) AS "avg_profit",
    (- "round"("avg"(((COALESCE("interest", (0)::numeric) + COALESCE("tax", (0)::numeric)) + COALESCE("fee", (0)::numeric))))) AS "avg_expense",
    "jsonb_build_object"('snapshot_date', "jsonb_agg"(("snapshot_date")::"text" ORDER BY "snapshot_date"), 'revenue', "jsonb_agg"((((COALESCE("pnl", (0)::numeric) + COALESCE("fee", (0)::numeric)) + COALESCE("interest", (0)::numeric)) + COALESCE("tax", (0)::numeric)) ORDER BY "snapshot_date"), 'fee', "jsonb_agg"(COALESCE((- "fee"), (0)::numeric) ORDER BY "snapshot_date"), 'interest', "jsonb_agg"(COALESCE((- "interest"), (0)::numeric) ORDER BY "snapshot_date"), 'tax', "jsonb_agg"(COALESCE((- "tax"), (0)::numeric) ORDER BY "snapshot_date")) AS "profit_chart"
   FROM ( SELECT ("date_trunc"('month'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date" AS "snapshot_date",
            "ds"."user_id",
            "sum"("ds"."intraday_pnl") AS "pnl",
            "sum"("ds"."intraday_interest") AS "interest",
            "sum"("ds"."intraday_tax") AS "tax",
            "sum"("ds"."intraday_fee") AS "fee"
           FROM "public"."daily_snapshots" "ds"
          GROUP BY (("date_trunc"('month'::"text", ("ds"."snapshot_date")::timestamp with time zone))::"date"), "ds"."user_id") "monthly"
  WHERE ("user_id" = "auth"."uid"())
  GROUP BY ((EXTRACT(year FROM "snapshot_date"))::integer);


ALTER VIEW "public"."pnl_expense_yearly" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_pnl_yearly" WITH ("security_invoker"='true') AS
 WITH "capital_legs" AS (
         SELECT "tl"."tx_id",
            ("tl"."credit" - "tl"."debit") AS "realized_pnl",
            "t"."created_at"
           FROM (("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "t" ON (("t"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a_1" ON (("tl"."asset_id" = "a_1"."id")))
          WHERE (("a_1"."ticker" = 'CAPITAL'::"text") AND ("t"."user_id" = "auth"."uid"()))
        ), "stock_legs" AS (
         SELECT "tl"."tx_id",
            "tl"."asset_id" AS "stock_id"
           FROM (("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a_1" ON (("a_1"."id" = "tl"."asset_id")))
          WHERE (("a_1"."asset_class" = 'stock'::"public"."asset_class") AND ("e"."user_id" = "auth"."uid"()))
        )
 SELECT (EXTRACT(year FROM "c"."created_at"))::integer AS "year",
    "a"."ticker",
    "a"."name",
    "a"."logo_url",
    "sum"("c"."realized_pnl") AS "total_pnl"
   FROM (("capital_legs" "c"
     JOIN "stock_legs" "s" ON (("s"."tx_id" = "c"."tx_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "s"."stock_id")))
  GROUP BY "a"."logo_url", "a"."name", "a"."ticker", (EXTRACT(year FROM "c"."created_at"));


ALTER VIEW "public"."stock_pnl_yearly" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_pnl_all" WITH ("security_invoker"='true') AS
 SELECT "ticker",
    "name",
    "logo_url",
    "sum"("total_pnl") AS "total_pnl"
   FROM "public"."stock_pnl_yearly" "s"
  GROUP BY "ticker", "name", "logo_url"
  ORDER BY ("sum"("total_pnl")) DESC;


ALTER VIEW "public"."stock_pnl_all" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tx_summary" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."created_at",
    "t"."category",
        CASE
            WHEN ("t"."category" = 'stock'::"public"."tx_category") THEN ("s"."operation")::"text"
            WHEN ("t"."category" = 'cashflow'::"public"."tx_category") THEN ("cf"."operation")::"text"
            ELSE ("t"."category")::"text"
        END AS "operation",
        CASE
            WHEN ("t"."category" = 'stock'::"public"."tx_category") THEN "s"."net_proceed"
            WHEN ("t"."category" = 'cashflow'::"public"."tx_category") THEN "cf"."net_proceed"
            WHEN ("t"."category" = 'borrow'::"public"."tx_category") THEN "b"."principal"
            ELSE "r"."net_proceed"
        END AS "value",
    "t"."memo"
   FROM (((("public"."tx_entries" "t"
     LEFT JOIN "public"."tx_stock" "s" ON (("t"."id" = "s"."tx_id")))
     LEFT JOIN "public"."tx_cashflow" "cf" ON (("t"."id" = "cf"."tx_id")))
     LEFT JOIN "public"."tx_borrow" "b" ON (("t"."id" = "b"."tx_id")))
     LEFT JOIN "public"."tx_repay" "r" ON (("t"."id" = "r"."tx_id")))
  WHERE ("t"."user_id" = "auth"."uid"());


ALTER VIEW "public"."tx_summary" OWNER TO "postgres";


ALTER TABLE ONLY "flight"."aircrafts"
    ADD CONSTRAINT "aircrafts_icao_code_key" UNIQUE ("icao_code");



ALTER TABLE ONLY "flight"."aircrafts"
    ADD CONSTRAINT "aircrafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "flight"."airlines"
    ADD CONSTRAINT "airlines_name_key" UNIQUE ("name");



ALTER TABLE ONLY "flight"."airlines"
    ADD CONSTRAINT "airlines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "flight"."airports"
    ADD CONSTRAINT "airports_iata_code_key" UNIQUE ("iata_code");



ALTER TABLE ONLY "flight"."airports"
    ADD CONSTRAINT "airports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_ticker_key" UNIQUE ("ticker");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."historical_prices"
    ADD CONSTRAINT "daily_security_prices_pkey" PRIMARY KEY ("asset_id", "date") INCLUDE ("close");



ALTER TABLE ONLY "public"."dnse_order_events"
    ADD CONSTRAINT "dnse_order_events_pkey" PRIMARY KEY ("received_at");



ALTER TABLE ONLY "public"."historical_fxrate"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency_code", "date") INCLUDE ("rate");



ALTER TABLE ONLY "public"."dnse_m1_close"
    ADD CONSTRAINT "m1_intraday_close_pkey" PRIMARY KEY ("symbol", "last_updated");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."tx_borrow"
    ADD CONSTRAINT "tx_borrow_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."tx_entries"
    ADD CONSTRAINT "tx_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_pkey" PRIMARY KEY ("tx_id", "asset_id");



ALTER TABLE ONLY "public"."tx_repay"
    ADD CONSTRAINT "tx_repay_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_dnse_account_id_key" UNIQUE ("dnse_account_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "flights_aircraft_id_idx" ON "flight"."flights" USING "btree" ("aircraft_id");



CREATE INDEX "flights_airline_id_idx" ON "flight"."flights" USING "btree" ("airline_id");



CREATE INDEX "flights_arrival_airport_id_idx" ON "flight"."flights" USING "btree" ("arrival_airport_id");



CREATE INDEX "flights_departure_airport_id_idx" ON "flight"."flights" USING "btree" ("departure_airport_id");



CREATE INDEX "flights_departure_time_idx" ON "flight"."flights" USING "btree" ("departure_time" DESC);



CREATE INDEX "assets_currency_code_idx" ON "public"."assets" USING "btree" ("currency_code");



CREATE INDEX "dnse_order_events_order_status_idx" ON "public"."dnse_order_events" USING "btree" ("order_status");



CREATE INDEX "dnse_order_events_symbol_idx" ON "public"."dnse_order_events" USING "btree" ("symbol");



CREATE INDEX "historical_prices_date_idx" ON "public"."historical_prices" USING "btree" ("date");



CREATE INDEX "idx_news_articles_related_stocks" ON "public"."news_articles" USING "gin" ("related_stocks");



CREATE INDEX "tx_cashflow_asset_id_idx" ON "public"."tx_cashflow" USING "btree" ("asset_id");



CREATE INDEX "tx_legs_asset_id_idx" ON "public"."tx_legs" USING "btree" ("asset_id");



CREATE INDEX "tx_stock_stock_id_idx" ON "public"."tx_stock" USING "btree" ("stock_id");



CREATE OR REPLACE TRIGGER "after_filled_dnse_orders" AFTER INSERT ON "public"."dnse_order_events" FOR EACH ROW EXECUTE FUNCTION "public"."process_dnse_order"();



CREATE OR REPLACE TRIGGER "after_new_fxrate" AFTER INSERT OR UPDATE ON "public"."historical_fxrate" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_daily_snapshots"();



CREATE OR REPLACE TRIGGER "after_new_m1_close" AFTER INSERT ON "public"."dnse_m1_close" FOR EACH ROW EXECUTE FUNCTION "public"."upsert_historical_prices"();



CREATE OR REPLACE TRIGGER "after_new_prices" AFTER INSERT OR UPDATE ON "public"."historical_prices" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_daily_snapshots"();



CREATE OR REPLACE TRIGGER "after_new_tx_borrow" AFTER INSERT ON "public"."tx_borrow" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_borrow"();



CREATE OR REPLACE TRIGGER "after_new_tx_cashflow" AFTER INSERT ON "public"."tx_cashflow" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_cashflow"();



CREATE OR REPLACE TRIGGER "after_new_tx_legs" AFTER INSERT ON "public"."tx_legs" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_daily_snapshots"();



CREATE OR REPLACE TRIGGER "after_new_tx_repay" AFTER INSERT ON "public"."tx_repay" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_repay"();



CREATE OR REPLACE TRIGGER "after_new_tx_stock" AFTER INSERT ON "public"."tx_stock" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_stock"();



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_aircrafts_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "flight"."aircrafts"("id");



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_airlines_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "flight"."airlines"("id");



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_arrival_airport_id_fkey" FOREIGN KEY ("arrival_airport_id") REFERENCES "flight"."airports"("id");



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_departure_airport_id_fkey" FOREIGN KEY ("departure_airport_id") REFERENCES "flight"."airports"("id");



ALTER TABLE ONLY "flight"."flights"
    ADD CONSTRAINT "flights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_currency_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."historical_prices"
    ADD CONSTRAINT "daily_security_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dnse_order_events"
    ADD CONSTRAINT "dnse_order_events_account_no_fkey" FOREIGN KEY ("account_no") REFERENCES "public"."user_settings"("dnse_account_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dnse_order_events"
    ADD CONSTRAINT "dnse_order_events_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."assets"("ticker") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historical_fxrate"
    ADD CONSTRAINT "exchange_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dnse_m1_close"
    ADD CONSTRAINT "m1_intraday_close_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."assets"("ticker") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_borrow"
    ADD CONSTRAINT "tx_borrow_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_entries"
    ADD CONSTRAINT "tx_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_repay"
    ADD CONSTRAINT "tx_repay_borrow_tx_fkey" FOREIGN KEY ("borrow_tx") REFERENCES "public"."tx_borrow"("tx_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_repay"
    ADD CONSTRAINT "tx_repay_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Auth users can read aircrafts" ON "flight"."aircrafts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Auth users can read airlines" ON "flight"."airlines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Auth users can read airports" ON "flight"."airports" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for users based on user_id" ON "flight"."flights" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to delete their own data only" ON "flight"."flights" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "flight"."flights" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "flight"."aircrafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "flight"."airlines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "flight"."airports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "flight"."flights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Auth users can read assets" ON "public"."assets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Auth users can read currencies" ON "public"."currencies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for users based on user_id" ON "public"."tx_entries" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."news_articles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users only" ON "public"."historical_fxrate" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users only" ON "public"."historical_prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable users to insert their own borrow txs" ON "public"."tx_borrow" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_borrow"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable users to insert their own cashflow txs" ON "public"."tx_cashflow" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_cashflow"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable users to insert their own repay txs" ON "public"."tx_repay" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_repay"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable users to insert their own stock txs" ON "public"."tx_stock" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_stock"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable users to insert their own tx legs" ON "public"."tx_legs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_legs"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable users to view their own data only" ON "public"."tx_entries" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."user_settings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own cashflow txs" ON "public"."tx_cashflow" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_cashflow"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own legs" ON "public"."tx_legs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_legs"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own stock txs" ON "public"."tx_stock" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_stock"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read their own borrow txs" ON "public"."tx_borrow" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_borrow"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read their own repay txs" ON "public"."tx_repay" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_repay"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own borrow txs" ON "public"."tx_borrow" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_borrow"."tx_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tx_entries" "e"
  WHERE (("e"."id" = "tx_borrow"."tx_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnse_m1_close" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnse_order_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historical_fxrate" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historical_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_borrow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_cashflow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_legs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_repay" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "flight" TO "anon";
GRANT USAGE ON SCHEMA "flight" TO "authenticated";
GRANT USAGE ON SCHEMA "flight" TO "service_role";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "flight"."insert_flight_with_timezone"("p_flight_number" "text", "p_airline_id" "uuid", "p_aircraft_id" "uuid", "p_departure_airport_id" "uuid", "p_arrival_airport_id" "uuid", "p_departure_local" "text", "p_arrival_local" "text") TO "anon";
GRANT ALL ON FUNCTION "flight"."insert_flight_with_timezone"("p_flight_number" "text", "p_airline_id" "uuid", "p_aircraft_id" "uuid", "p_departure_airport_id" "uuid", "p_arrival_airport_id" "uuid", "p_departure_local" "text", "p_arrival_local" "text") TO "authenticated";
GRANT ALL ON FUNCTION "flight"."insert_flight_with_timezone"("p_flight_number" "text", "p_airline_id" "uuid", "p_aircraft_id" "uuid", "p_departure_airport_id" "uuid", "p_arrival_airport_id" "uuid", "p_departure_local" "text", "p_arrival_local" "text") TO "service_role";









GRANT ALL ON FUNCTION "public"."active_stock_tickers"() TO "anon";
GRANT ALL ON FUNCTION "public"."active_stock_tickers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."active_stock_tickers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric, "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric, "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric, "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric, "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric, "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric, "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric, "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric, "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric, "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_dnse_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_dnse_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_dnse_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_borrow"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_borrow"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_borrow"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_repay"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_repay"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_repay"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_daily_snapshots"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_snapshots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_snapshots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_borrow"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_borrow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_borrow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_repay"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_repay"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_repay"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_historical_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_historical_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_historical_prices"() TO "service_role";





























































































GRANT ALL ON TABLE "flight"."aircrafts" TO "anon";
GRANT ALL ON TABLE "flight"."aircrafts" TO "authenticated";
GRANT ALL ON TABLE "flight"."aircrafts" TO "service_role";



GRANT ALL ON TABLE "flight"."airlines" TO "anon";
GRANT ALL ON TABLE "flight"."airlines" TO "authenticated";
GRANT ALL ON TABLE "flight"."airlines" TO "service_role";



GRANT ALL ON TABLE "flight"."airports" TO "anon";
GRANT ALL ON TABLE "flight"."airports" TO "authenticated";
GRANT ALL ON TABLE "flight"."airports" TO "service_role";



GRANT ALL ON TABLE "flight"."flights" TO "anon";
GRANT ALL ON TABLE "flight"."flights" TO "authenticated";
GRANT ALL ON TABLE "flight"."flights" TO "service_role";



GRANT ALL ON TABLE "flight"."routes_geojson" TO "anon";
GRANT ALL ON TABLE "flight"."routes_geojson" TO "authenticated";
GRANT ALL ON TABLE "flight"."routes_geojson" TO "service_role";



GRANT ALL ON TABLE "flight"."flights_readable" TO "anon";
GRANT ALL ON TABLE "flight"."flights_readable" TO "authenticated";
GRANT ALL ON TABLE "flight"."flights_readable" TO "service_role";



GRANT ALL ON TABLE "flight"."lifetime_stats" TO "anon";
GRANT ALL ON TABLE "flight"."lifetime_stats" TO "authenticated";
GRANT ALL ON TABLE "flight"."lifetime_stats" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."historical_fxrate" TO "anon";
GRANT ALL ON TABLE "public"."historical_fxrate" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_fxrate" TO "service_role";



GRANT ALL ON TABLE "public"."historical_prices" TO "anon";
GRANT ALL ON TABLE "public"."historical_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_prices" TO "service_role";



GRANT ALL ON TABLE "public"."tx_borrow" TO "anon";
GRANT ALL ON TABLE "public"."tx_borrow" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_borrow" TO "service_role";



GRANT ALL ON TABLE "public"."tx_entries" TO "anon";
GRANT ALL ON TABLE "public"."tx_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tx_repay" TO "anon";
GRANT ALL ON TABLE "public"."tx_repay" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_repay" TO "service_role";



GRANT ALL ON TABLE "public"."outstanding_debts" TO "anon";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "authenticated";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "service_role";



GRANT ALL ON TABLE "public"."tx_legs" TO "anon";
GRANT ALL ON TABLE "public"."tx_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_legs" TO "service_role";



GRANT ALL ON TABLE "public"."balance_sheet" TO "anon";
GRANT ALL ON TABLE "public"."balance_sheet" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_sheet" TO "service_role";



GRANT ALL ON TABLE "public"."tx_cashflow" TO "anon";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "service_role";



GRANT ALL ON TABLE "public"."tx_stock" TO "anon";
GRANT ALL ON TABLE "public"."tx_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_stock" TO "service_role";



GRANT ALL ON TABLE "public"."daily_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."benchmark_all" TO "anon";
GRANT ALL ON TABLE "public"."benchmark_all" TO "authenticated";
GRANT ALL ON TABLE "public"."benchmark_all" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."benchmark_rollings" TO "anon";
GRANT ALL ON TABLE "public"."benchmark_rollings" TO "authenticated";
GRANT ALL ON TABLE "public"."benchmark_rollings" TO "service_role";



GRANT ALL ON TABLE "public"."benchmark_yearly" TO "anon";
GRANT ALL ON TABLE "public"."benchmark_yearly" TO "authenticated";
GRANT ALL ON TABLE "public"."benchmark_yearly" TO "service_role";



GRANT ALL ON TABLE "public"."cashflow_all" TO "anon";
GRANT ALL ON TABLE "public"."cashflow_all" TO "authenticated";
GRANT ALL ON TABLE "public"."cashflow_all" TO "service_role";



GRANT ALL ON TABLE "public"."cashflow_yearly" TO "anon";
GRANT ALL ON TABLE "public"."cashflow_yearly" TO "authenticated";
GRANT ALL ON TABLE "public"."cashflow_yearly" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_m1_close" TO "anon";
GRANT ALL ON TABLE "public"."dnse_m1_close" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_m1_close" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_order_events" TO "anon";
GRANT ALL ON TABLE "public"."dnse_order_events" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_order_events" TO "service_role";



GRANT ALL ON TABLE "public"."equity_rollings" TO "anon";
GRANT ALL ON TABLE "public"."equity_rollings" TO "authenticated";
GRANT ALL ON TABLE "public"."equity_rollings" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."pnl_expense_all" TO "anon";
GRANT ALL ON TABLE "public"."pnl_expense_all" TO "authenticated";
GRANT ALL ON TABLE "public"."pnl_expense_all" TO "service_role";



GRANT ALL ON TABLE "public"."pnl_expense_last1y" TO "anon";
GRANT ALL ON TABLE "public"."pnl_expense_last1y" TO "authenticated";
GRANT ALL ON TABLE "public"."pnl_expense_last1y" TO "service_role";



GRANT ALL ON TABLE "public"."pnl_expense_yearly" TO "anon";
GRANT ALL ON TABLE "public"."pnl_expense_yearly" TO "authenticated";
GRANT ALL ON TABLE "public"."pnl_expense_yearly" TO "service_role";



GRANT ALL ON TABLE "public"."stock_pnl_yearly" TO "anon";
GRANT ALL ON TABLE "public"."stock_pnl_yearly" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_pnl_yearly" TO "service_role";



GRANT ALL ON TABLE "public"."stock_pnl_all" TO "anon";
GRANT ALL ON TABLE "public"."stock_pnl_all" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_pnl_all" TO "service_role";



GRANT ALL ON TABLE "public"."tx_summary" TO "anon";
GRANT ALL ON TABLE "public"."tx_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_summary" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "flight" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

