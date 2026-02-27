


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






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE TYPE "public"."equity_point" AS (
	"snapshot_date" "date",
	"net_equity" numeric,
	"cumulative_cashflow" numeric
);


ALTER TYPE "public"."equity_point" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx_id uuid;
begin
  -- Insert into tx_entries
  insert into public.tx_entries (category, memo)
  values (
    'debt',
    'Borrow ' || p_principal::text || ' from ' || p_lender || ' at ' || to_char(p_rate, 'FM90.##%')
  )
  returning id into v_tx_id;

  -- Insert into tx_cashflow
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
end;
$$;


ALTER FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
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
  insert into public.tx_entries (category, memo)
  values ('cashflow', p_memo)
  returning id into v_tx_id;

  -- Insert into tx_cashflow
  insert into public.tx_cashflow (
    tx_id,
    asset_id,
    operation,
    quantity,
    fx_rate
  )
  values (v_tx_id, p_asset_id, p_operation, p_quantity, v_fx_rate);
end;
$$;


ALTER FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
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
  insert into public.tx_entries (category, memo)
  values (
    'debt',
    'Repay to ' || v_lender
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
end;
$$;


ALTER FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx_id uuid;
  v_stock_id uuid;
  v_memo text;
begin
  -- Find stock id
  select a.id into v_stock_id from public.assets a where a.ticker = p_ticker;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo)
  values (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text
  ) returning id into v_tx_id;

  -- Insert into tx_stock
  insert into public.tx_stock (
    tx_id,
    side,
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
$$;


ALTER FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start_equity NUMERIC;
  v_end_equity NUMERIC;
  v_cash_flow NUMERIC;
  v_pnl NUMERIC;
BEGIN
  -- Get starting equity (closing equity of the day before the start date)
  SELECT net_equity INTO v_start_equity
  FROM public.daily_snapshots
  WHERE snapshot_date < p_start_date
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- If no prior snapshot, this is the first month.
  -- Use the opening equity of the first day as the starting equity.
  IF v_start_equity IS NULL THEN
    SELECT (net_equity - net_cashflow) INTO v_start_equity
    FROM public.daily_snapshots
    WHERE snapshot_date >= p_start_date
    ORDER BY snapshot_date ASC
    LIMIT 1;
  END IF;

  -- Get ending equity (closing equity of the end date)
  SELECT net_equity INTO v_end_equity
  FROM public.daily_snapshots
  WHERE snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Get net cash flow for the period
  SELECT COALESCE(SUM(net_cashflow), 0) INTO v_cash_flow
  FROM public.daily_snapshots
  WHERE snapshot_date >= p_start_date AND snapshot_date <= p_end_date;

  -- Calculate PnL
  v_pnl := (COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow;

  RETURN v_pnl;
END;
$$;


ALTER FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start_index NUMERIC;
  v_end_index NUMERIC;
  v_twr NUMERIC;
BEGIN
  -- Get the equity index from the day before the start date
  SELECT equity_index INTO v_start_index
  FROM public.daily_snapshots
  WHERE snapshot_date < p_start_date
  ORDER BY snapshot_date DESC
  LIMIT 1;
  -- If no prior snapshot, this is the first month.
  -- The starting index is conceptually 100 before the first day.
  IF v_start_index IS NULL THEN v_start_index := 100;
  END IF;
  -- Get the equity index at the end of the period
  SELECT equity_index INTO v_end_index
  FROM public.daily_snapshots
  WHERE snapshot_date <= p_end_date
  ORDER BY snapshot_date DESC
  LIMIT 1;
  -- If there's no data for the period, return 0
  IF v_end_index IS NULL THEN RETURN 0;
  END IF;
  -- Calculate TWR as the percentage change in the equity index
  v_twr := (v_end_index / v_start_index) - 1;
  RETURN v_twr;
END;
$$;


ALTER FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  WHERE snapshot_date BETWEEN p_start_date AND p_end_date;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_agg(to_jsonb(x))
      FROM unnest(raw_data) x
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

  SELECT jsonb_agg(to_jsonb(x))
  INTO final_result
  FROM unnest(result_data) x;

  RETURN final_result;
END;
$$;


ALTER FUNCTION "public"."get_equity_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  WHERE snapshot_date >= p_start_date
  ORDER BY snapshot_date
  LIMIT 1;

  SELECT hp.close
  INTO v_first_vni_value
  FROM historical_prices hp
    join assets a on a.id = hp.asset_id
  WHERE a.ticker = 'VNINDEX'
    AND hp.date >= p_start_date
  ORDER BY hp.date
  LIMIT 1;

  -- Load dataset into memory array
  SELECT array_agg(t ORDER BY snapshot_date)
  INTO raw_data
  FROM (
    SELECT
      pd.snapshot_date,
      (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 AS portfolio_value,
      (hp.close / NULLIF(v_first_vni_value, 0)) * 100 AS vni_value
    FROM daily_snapshots pd
    JOIN historical_prices hp ON pd.snapshot_date = hp.date
    join assets a on a.id = hp.asset_id
    WHERE pd.snapshot_date BETWEEN p_start_date AND p_end_date
      AND a.ticker = 'VNINDEX'
  ) t;

  data_count := array_length(raw_data, 1);

  IF data_count IS NULL OR data_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- If below threshold → return full set
  IF data_count <= p_threshold THEN
    RETURN (
      SELECT jsonb_agg(to_jsonb(x))
      FROM unnest(raw_data) x
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

    -- Compute next bucket average
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

  -- Add last point
  result_data := result_data || raw_data[data_count];

  -- Return JSON
  SELECT jsonb_agg(to_jsonb(x))
  INTO final_result
  FROM unnest(result_data) x;

  RETURN final_result;
END;
$$;


ALTER FUNCTION "public"."get_return_chart"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_dnse_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only process fully filled orders
  IF NEW.order_status = 'Filled' THEN
    PERFORM public.add_stock_event(
      NEW.side,
      NEW.symbol,
      NEW.average_price,
      NEW.fill_quantity,
      NEW.fee,
      NEW.tax
    );
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."process_dnse_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r tx_cashflow%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_cash_currency text;
  v_new_qty numeric;
  v_new_avg_cost numeric;
BEGIN
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
      SELECT * INTO v_pos FROM public.asset_positions WHERE asset_id = v_cash_asset;
      IF NOT FOUND THEN
        INSERT INTO public.asset_positions (asset_id, quantity, average_cost)
        VALUES (v_cash_asset, 0, 0)
        RETURNING * INTO v_pos;
      END IF;

      v_new_qty := v_pos.quantity + r.quantity;
      v_new_avg_cost := (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty;

      UPDATE public.asset_positions
      SET quantity = v_new_qty,
        average_cost = v_new_avg_cost
      WHERE asset_id = v_cash_asset;
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
        SELECT * INTO v_pos FROM public.asset_positions WHERE asset_id = v_cash_asset;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'No position found for asset %, cannot withdraw', v_cash_asset;
        END IF;

        IF v_pos.quantity < r.quantity THEN
          RAISE EXCEPTION 'Not enough balance to withdraw %', r.tx_id;
        END IF;

        UPDATE public.asset_positions
        SET quantity = v_pos.quantity - r.quantity
        WHERE asset_id = v_cash_asset;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  r tx_debt%rowtype;
  v_cash_asset uuid;
  v_debt_asset uuid;
  v_equity_asset uuid;
begin
  -- Load transaction
  select * into r from public.tx_debt where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker = 'FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  select id into v_debt_asset from public.assets where ticker = 'DEBTS';

  -- Clear any prior legs for this transaction
  delete from public.tx_legs where tx_id = p_tx_id;

  -- Process operation type
  if r.operation = 'borrow' then
    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit debt
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, r.net_proceed, 0, r.net_proceed);

  else -- Repay operation
    -- Credit cash (payment)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

    -- Debit debt (liability reduced)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, -r.principal, r.principal, 0);

    -- Debit equity (interest expense)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_equity_asset, -r.interest, r.interest, 0);
  end if;
end;
$$;


ALTER FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
begin
  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  v_stock_asset := r.stock_id;

  -- Fetch or initialize position
  select * into v_pos from public.asset_positions where asset_id = r.stock_id;
  if not found then
    insert into public.asset_positions (asset_id, quantity, average_cost)
    values (r.stock_id, 0, 0)
    returning * into v_pos;
  end if;

  -- Process transaction
  if r.side = 'buy' then
    v_new_qty := v_pos.quantity + r.quantity;
    v_new_avg_cost :=
      case
        when v_new_qty = 0 then 0
        else (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty
      end;

    update public.asset_positions
    set quantity = v_new_qty,
      average_cost = v_new_avg_cost
    where asset_id = r.stock_id;

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
    where asset_id = r.stock_id;

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
      GREATEST(-v_realized_gain, 0), -- Debit equity when negative realized gain
      GREATEST(v_realized_gain, 0) -- Credit equity when positive realized gain
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_ledger"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
    r record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;
    truncate table public.asset_positions cascade;

    -- Step 2: replay all transactions in chronological order
    for r in
        select id as tx_id, category, created_at
        from public.tx_entries
        where category in ('stock', 'cashflow', 'debt')
        order by created_at asc
    loop
        if r.category = 'stock' then
            perform public.process_tx_stock(r.tx_id);

        elsif r.category = 'cashflow' then
            perform public.process_tx_cashflow(r.tx_id);

        elsif r.category = 'debt' then
            perform public.process_tx_debt(r.tx_id);

        else
            raise notice 'Skipping unknown category % for tx_id %', r.category, r.tx_id;
        end if;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;
$$;


ALTER FUNCTION "public"."rebuild_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_on_child_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    -- Rebuild the entire ledger whenever a child transaction changes
    perform public.rebuild_ledger();
    return new;
end;
$$;


ALTER FUNCTION "public"."rebuild_on_child_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_cashflow_func"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    perform public.process_tx_cashflow(new.tx_id);
    return new;
end;
$$;


ALTER FUNCTION "public"."trg_process_tx_cashflow_func"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_debt_func"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    perform public.process_tx_debt(new.tx_id);
    return new;
end;
$$;


ALTER FUNCTION "public"."trg_process_tx_debt_func"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_process_tx_stock_func"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    perform public.process_tx_stock(new.tx_id);
    return new;
end;
$$;


ALTER FUNCTION "public"."trg_process_tx_stock_func"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asset_positions" (
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(18,2) DEFAULT 0 NOT NULL,
    "average_cost" numeric(18,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."asset_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" "text" NOT NULL,
    "logo_url" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."balance_sheet" AS
SELECT
    NULL::"text" AS "ticker",
    NULL::"text" AS "name",
    NULL::"public"."asset_class" AS "asset_class",
    NULL::numeric AS "quantity",
    NULL::numeric AS "total_value";


ALTER VIEW "public"."balance_sheet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_exchange_rates" (
    "currency_code" "text" NOT NULL,
    "date" "date" NOT NULL,
    "rate" numeric(14,2) NOT NULL
);


ALTER TABLE "public"."daily_exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_market_indices" (
    "date" "date" NOT NULL,
    "symbol" "text" NOT NULL,
    "close" numeric
);


ALTER TABLE "public"."daily_market_indices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historical_prices" (
    "asset_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "close" numeric NOT NULL
);


ALTER TABLE "public"."historical_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_cashflow" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "operation" "public"."cashflow_ops" NOT NULL,
    "quantity" numeric(18,2) NOT NULL,
    "fx_rate" numeric DEFAULT 1 NOT NULL,
    "net_proceed" numeric(16,0) GENERATED ALWAYS AS (("quantity" * "fx_rate")) STORED NOT NULL
);


ALTER TABLE "public"."tx_cashflow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_debt" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation" "text" NOT NULL,
    "principal" numeric(16,0) NOT NULL,
    "interest" numeric(16,0) DEFAULT 0 NOT NULL,
    "net_proceed" numeric(16,0) GENERATED ALWAYS AS (("principal" + "interest")) STORED NOT NULL,
    "lender" "text",
    "rate" numeric(6,2),
    "repay_tx" "uuid"
);


ALTER TABLE "public"."tx_debt" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" NOT NULL,
    "memo" "text"
);


ALTER TABLE "public"."tx_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_legs" (
    "tx_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(18,2) NOT NULL,
    "debit" numeric(16,0) NOT NULL,
    "credit" numeric(16,0) NOT NULL
);


ALTER TABLE "public"."tx_legs" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."daily_snapshots" AS
 WITH "dates" AS (
         SELECT ("generate_series"((GREATEST('2021-11-09'::"date", COALESCE(( SELECT ("min"("tx_entries"."created_at"))::"date" AS "min"
                   FROM "public"."tx_entries"), '2021-11-09'::"date")))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::"date" AS "snapshot_date"
        ), "business_days" AS (
         SELECT "dates"."snapshot_date"
           FROM "dates"
          WHERE (EXTRACT(isodow FROM "dates"."snapshot_date") <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), "positions" AS (
         SELECT "d"."snapshot_date",
            "tl"."asset_id",
            "a"."currency_code",
            "sum"("tl"."quantity") AS "quantity"
           FROM ((("business_days" "d"
             JOIN "public"."tx_legs" "tl" ON (("tl"."tx_id" IN ( SELECT "e2"."id"
                   FROM "public"."tx_entries" "e2"
                  WHERE (("e2"."created_at")::"date" <= "d"."snapshot_date")))))
             JOIN "public"."tx_entries" "e_ref" ON (("e_ref"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
          WHERE ("a"."asset_class" <> ALL (ARRAY['equity'::"public"."asset_class", 'liability'::"public"."asset_class"]))
          GROUP BY "d"."snapshot_date", "tl"."asset_id", "a"."currency_code"
        ), "asset_prices" AS (
         SELECT "p"."snapshot_date",
            "p"."asset_id",
            "p"."price"
           FROM ( SELECT "pos"."snapshot_date",
                    "pos"."asset_id",
                    ( SELECT "dsp"."close" AS "price"
                           FROM "public"."historical_prices" "dsp"
                          WHERE (("dsp"."asset_id" = "pos"."asset_id") AND ("dsp"."date" <= "pos"."snapshot_date"))
                          ORDER BY "dsp"."date" DESC
                         LIMIT 1) AS "price"
                   FROM "positions" "pos") "p"
        ), "asset_fx" AS (
         SELECT "pos"."snapshot_date",
            "pos"."currency_code",
            ( SELECT "der"."rate"
                   FROM "public"."daily_exchange_rates" "der"
                  WHERE (("der"."currency_code" = "pos"."currency_code") AND ("der"."date" <= "pos"."snapshot_date"))
                  ORDER BY "der"."date" DESC
                 LIMIT 1) AS "rate"
           FROM ( SELECT DISTINCT "positions"."snapshot_date",
                    "positions"."currency_code"
                   FROM "positions") "pos"
        ), "total_assets_per_day" AS (
         SELECT "pos"."snapshot_date",
            COALESCE("sum"((("pos"."quantity" * COALESCE("ap"."price", (1)::numeric)) * COALESCE("af"."rate", (1)::numeric))), (0)::numeric) AS "total_assets"
           FROM (("positions" "pos"
             LEFT JOIN "asset_prices" "ap" ON ((("ap"."snapshot_date" = "pos"."snapshot_date") AND ("ap"."asset_id" = "pos"."asset_id"))))
             LEFT JOIN "asset_fx" "af" ON ((("af"."snapshot_date" = "pos"."snapshot_date") AND ("af"."currency_code" = "pos"."currency_code"))))
          GROUP BY "pos"."snapshot_date"
        ), "debt_events" AS (
         SELECT "b"."tx_id" AS "borrow_tx_id",
            "b"."principal",
            "b"."rate",
            ("e_b"."created_at")::"date" AS "borrow_date",
            ("e_r"."created_at")::"date" AS "repay_date"
           FROM ((("public"."tx_debt" "b"
             JOIN "public"."tx_entries" "e_b" ON (("e_b"."id" = "b"."tx_id")))
             LEFT JOIN "public"."tx_debt" "r" ON ((("r"."repay_tx" = "b"."tx_id") AND ("r"."operation" = 'repay'::"text"))))
             LEFT JOIN "public"."tx_entries" "e_r" ON (("e_r"."id" = "r"."tx_id")))
          WHERE ("b"."operation" = 'borrow'::"text")
        ), "debt_balances_by_day" AS (
         SELECT "d"."snapshot_date",
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
             CROSS JOIN "business_days" "d")
          WHERE ("de"."borrow_date" <= "d"."snapshot_date")
        ), "total_liabilities_per_day" AS (
         SELECT "debt_balances_by_day"."snapshot_date",
            COALESCE("sum"("debt_balances_by_day"."balance_at_date"), (0)::numeric) AS "total_liabilities"
           FROM "debt_balances_by_day"
          GROUP BY "debt_balances_by_day"."snapshot_date"
        ), "net_cashflow_per_day" AS (
         SELECT ("e"."created_at")::"date" AS "snapshot_date",
            COALESCE(("sum"("tl"."credit") - "sum"("tl"."debit")), (0)::numeric) AS "net_cashflow"
           FROM ((("public"."tx_entries" "e"
             JOIN "public"."tx_legs" "tl" ON (("tl"."tx_id" = "e"."id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
             JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "e"."id")))
          WHERE (("cf"."operation" = ANY (ARRAY['deposit'::"public"."cashflow_ops", 'withdraw'::"public"."cashflow_ops"])) AND ("a"."asset_class" = 'equity'::"public"."asset_class"))
          GROUP BY (("e"."created_at")::"date")
        ), "base" AS (
         SELECT "d"."snapshot_date",
            COALESCE("tad"."total_assets", (0)::numeric) AS "total_assets",
            COALESCE("tld"."total_liabilities", (0)::numeric) AS "total_liabilities",
            COALESCE("nc"."net_cashflow", (0)::numeric) AS "net_cashflow",
            (COALESCE("tad"."total_assets", (0)::numeric) - COALESCE("tld"."total_liabilities", (0)::numeric)) AS "net_equity"
           FROM ((("business_days" "d"
             LEFT JOIN "total_assets_per_day" "tad" ON (("tad"."snapshot_date" = "d"."snapshot_date")))
             LEFT JOIN "total_liabilities_per_day" "tld" ON (("tld"."snapshot_date" = "d"."snapshot_date")))
             LEFT JOIN "net_cashflow_per_day" "nc" ON (("nc"."snapshot_date" = "d"."snapshot_date")))
        ), "with_returns" AS (
         SELECT "b"."snapshot_date",
            "b"."total_assets",
            "b"."total_liabilities",
            "b"."net_equity",
            "b"."net_cashflow",
            COALESCE("sum"("b"."net_cashflow") OVER (ORDER BY "b"."snapshot_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::numeric) AS "cumulative_cashflow",
                CASE
                    WHEN ("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date") IS NULL) THEN (0)::numeric
                    WHEN ("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date") = (0)::numeric) THEN (0)::numeric
                    ELSE ((("b"."net_equity" - "b"."net_cashflow") - "lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date")) / NULLIF("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date"), (0)::numeric))
                END AS "daily_return"
           FROM "base" "b"
        ), "with_index" AS (
         SELECT "with_returns"."snapshot_date",
            "with_returns"."total_assets",
            "with_returns"."total_liabilities",
            "with_returns"."net_equity",
            "with_returns"."net_cashflow",
            "with_returns"."cumulative_cashflow",
            "with_returns"."daily_return",
            COALESCE(((1)::numeric + "with_returns"."daily_return"), (1)::numeric) AS "factor",
            (("exp"("sum"("ln"(GREATEST("abs"(COALESCE(((1)::numeric + "with_returns"."daily_return"), (1)::numeric)), 0.000000000001))) OVER (ORDER BY "with_returns"."snapshot_date")) * (100)::numeric) * (
                CASE
                    WHEN (("count"(*) FILTER (WHERE (((1)::numeric + "with_returns"."daily_return") < (0)::numeric)) OVER (ORDER BY "with_returns"."snapshot_date") % (2)::bigint) = 1) THEN '-1'::integer
                    ELSE 1
                END)::numeric) AS "equity_index"
           FROM "with_returns"
        )
 SELECT "snapshot_date",
    "total_assets",
    "total_liabilities",
    "net_equity",
    "net_cashflow",
    "cumulative_cashflow",
    "equity_index"
   FROM "with_index"
  ORDER BY "snapshot_date" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."daily_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_stock" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "side" "text" NOT NULL,
    "stock_id" "uuid" NOT NULL,
    "price" numeric(16,0) DEFAULT 0 NOT NULL,
    "quantity" numeric(16,0) NOT NULL,
    "fee" numeric(16,0) NOT NULL,
    "tax" numeric(16,0) DEFAULT 0 NOT NULL,
    "net_proceed" numeric(16,0) GENERATED ALWAYS AS (
CASE
    WHEN ("side" = 'buy'::"text") THEN ((("price" * "quantity") + "fee") + "tax")
    WHEN ("side" = 'sell'::"text") THEN ((("price" * "quantity") - "fee") - "tax")
    ELSE (0)::numeric
END) STORED NOT NULL
);


ALTER TABLE "public"."tx_stock" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_snapshots" WITH ("security_invoker"='on') AS
 WITH "month_ranges" AS (
         SELECT ("date_trunc"('month'::"text", "d"."d"))::"date" AS "month_start",
            LEAST((("date_trunc"('month'::"text", "d"."d") + '1 mon -1 days'::interval))::"date", CURRENT_DATE) AS "month_end"
           FROM "generate_series"('2021-11-01 00:00:00+00'::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) "d"("d")
        ), "monthly_transactions" AS (
         SELECT ("date_trunc"('month'::"text", "t"."created_at"))::"date" AS "month",
            ("sum"("s"."fee") + "sum"("cf"."net_proceed") FILTER (WHERE ("t"."memo" ~~* '%fee%'::"text"))) AS "total_fees",
            "sum"("s"."tax") AS "total_taxes",
            "sum"("d"."interest") AS "loan_interest",
            "sum"("cf"."net_proceed") FILTER (WHERE ("t"."memo" ~~* '%interest%'::"text")) AS "margin_interest"
           FROM ((("public"."tx_entries" "t"
             LEFT JOIN "public"."tx_debt" "d" ON (("d"."tx_id" = "t"."id")))
             LEFT JOIN "public"."tx_stock" "s" ON (("s"."tx_id" = "t"."id")))
             LEFT JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "t"."id")))
          GROUP BY (("date_trunc"('month'::"text", "t"."created_at"))::"date")
        ), "monthly_pnl" AS (
         SELECT "m_1"."month_start",
            "m_1"."month_end",
            "start_s"."net_equity" AS "start_equity",
            "end_s"."net_equity" AS "end_equity",
            COALESCE("sum"("ds"."net_cashflow"), (0)::numeric) AS "cash_flow",
            ((COALESCE("end_s"."net_equity", (0)::numeric) - COALESCE("start_s"."net_equity", (0)::numeric)) - COALESCE("sum"("ds"."net_cashflow"), (0)::numeric)) AS "pnl"
           FROM ((("month_ranges" "m_1"
             LEFT JOIN "public"."daily_snapshots" "ds" ON ((("ds"."snapshot_date" >= "m_1"."month_start") AND ("ds"."snapshot_date" <= "m_1"."month_end"))))
             LEFT JOIN LATERAL ( SELECT "s"."net_equity"
                   FROM "public"."daily_snapshots" "s"
                  WHERE ("s"."snapshot_date" < "m_1"."month_start")
                  ORDER BY "s"."snapshot_date" DESC
                 LIMIT 1) "start_s" ON (true))
             LEFT JOIN LATERAL ( SELECT "s"."net_equity"
                   FROM "public"."daily_snapshots" "s"
                  WHERE ("s"."snapshot_date" <= "m_1"."month_end")
                  ORDER BY "s"."snapshot_date" DESC
                 LIMIT 1) "end_s" ON (true))
          GROUP BY "m_1"."month_start", "m_1"."month_end", "start_s"."net_equity", "end_s"."net_equity"
        )
 SELECT "m"."month_start" AS "snapshot_date",
    "mp"."pnl",
    (COALESCE("mt"."loan_interest", (0)::numeric) + COALESCE("mt"."margin_interest", (0)::numeric)) AS "interest",
    COALESCE("mt"."total_taxes", (0)::numeric) AS "tax",
    COALESCE("mt"."total_fees", (0)::numeric) AS "fee"
   FROM (("month_ranges" "m"
     LEFT JOIN "monthly_pnl" "mp" ON (("mp"."month_start" = "m"."month_start")))
     LEFT JOIN "monthly_transactions" "mt" ON (("mt"."month" = "m"."month_start")))
  ORDER BY "m"."month_start" DESC;


ALTER VIEW "public"."monthly_snapshots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."outstanding_debts" WITH ("security_invoker"='on') AS
 WITH "borrow_tx" AS (
         SELECT "d"."tx_id",
            "d"."lender",
            "d"."principal",
            "d"."rate",
            "e"."created_at" AS "borrow_date"
           FROM ("public"."tx_debt" "d"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
          WHERE (("d"."operation" = 'borrow'::"text") AND (NOT ("d"."tx_id" IN ( SELECT DISTINCT "tx_debt"."repay_tx"
                   FROM "public"."tx_debt"
                  WHERE ("tx_debt"."repay_tx" IS NOT NULL)))))
        )
 SELECT "tx_id",
    "lender",
    "principal",
    "rate",
    "borrow_date",
    EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "borrow_date")) AS "duration",
    "round"((("principal" * "power"(((1)::numeric + (("rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "borrow_date")))) - "principal"), 2) AS "interest"
   FROM "borrow_tx" "b"
  ORDER BY "borrow_date";


ALTER VIEW "public"."outstanding_debts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_holdings" WITH ("security_invoker"='on') AS
 WITH "latest_data" AS (
         SELECT DISTINCT ON ("dsp"."asset_id") "dsp"."asset_id",
            "dsp"."close" AS "price"
           FROM "public"."historical_prices" "dsp"
          ORDER BY "dsp"."asset_id", "dsp"."date" DESC
        )
 SELECT "a"."ticker",
    "a"."name",
    "a"."logo_url",
    "sum"("tl"."quantity") AS "quantity",
    "sum"(("tl"."debit" - "tl"."credit")) AS "cost_basis",
    COALESCE("ld"."price", (1)::numeric) AS "price"
   FROM (("public"."assets" "a"
     JOIN "public"."tx_legs" "tl" ON (("a"."id" = "tl"."asset_id")))
     LEFT JOIN "latest_data" "ld" ON (("ld"."asset_id" = "a"."id")))
  WHERE ("a"."asset_class" = 'stock'::"public"."asset_class")
  GROUP BY "a"."id", "a"."ticker", "a"."name", "a"."logo_url", "ld"."price"
 HAVING ("sum"("tl"."quantity") > (0)::numeric);


ALTER VIEW "public"."stock_holdings" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."dashboard_data" AS
 WITH "params" AS (
         SELECT CURRENT_DATE AS "today",
            ("date_trunc"('year'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "ytd_date",
            ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "mtd_date",
            '2000-01-01'::"date" AS "inception_date",
            ((CURRENT_DATE - '3 mons'::interval))::"date" AS "last3m_date",
            ((CURRENT_DATE - '6 mons'::interval))::"date" AS "last6m_date",
            ((CURRENT_DATE - '1 year'::interval))::"date" AS "last1y_date"
        ), "pnl" AS (
         SELECT "public"."calculate_pnl"("params"."ytd_date", "params"."today") AS "pnl_ytd",
            "public"."calculate_pnl"("params"."mtd_date", "params"."today") AS "pnl_mtd"
           FROM "params"
        ), "twr" AS (
         SELECT "public"."calculate_twr"("params"."ytd_date", "params"."today") AS "twr_ytd",
            "public"."calculate_twr"("params"."inception_date", "params"."today") AS "twr_all"
           FROM "params"
        ), "equity_chart" AS (
         SELECT "public"."get_equity_chart"("params"."last3m_date", "params"."today", 150) AS "equitychart_3m",
            "public"."get_equity_chart"("params"."last6m_date", "params"."today", 150) AS "equitychart_6m",
            "public"."get_equity_chart"("params"."last1y_date", "params"."today", 150) AS "equitychart_1y",
            "public"."get_equity_chart"("params"."inception_date", "params"."today", 150) AS "equitychart_all"
           FROM "params"
        ), "return_chart" AS (
         SELECT "public"."get_return_chart"("params"."last3m_date", "params"."today", 150) AS "returnchart_3m",
            "public"."get_return_chart"("params"."last6m_date", "params"."today", 150) AS "returnchart_6m",
            "public"."get_return_chart"("params"."last1y_date", "params"."today", 150) AS "returnchart_1y",
            "public"."get_return_chart"("params"."inception_date", "params"."today", 150) AS "returnchart_all"
           FROM "params"
        ), "balance" AS (
         SELECT "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'equity'::"public"."asset_class")) AS "total_equity",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'liability'::"public"."asset_class")) AS "total_liabilities",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'fund'::"public"."asset_class")) AS "fund",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'stock'::"public"."asset_class")) AS "stock",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'cash'::"public"."asset_class")) AS "cash",
            "max"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."ticker" = 'MARGIN'::"text")) AS "margin"
           FROM "public"."balance_sheet"
        ), "debt" AS (
         SELECT "sum"(("outstanding_debts"."principal" + "outstanding_debts"."interest")) AS "debts"
           FROM "public"."outstanding_debts"
        ), "monthly" AS (
         SELECT "sum"("last_12"."pnl") AS "total_pnl",
            "avg"("last_12"."pnl") AS "avg_profit",
            (- "avg"((("last_12"."interest" + "last_12"."tax") + "last_12"."fee"))) AS "avg_expense",
            ( SELECT "jsonb_agg"("jsonb_build_object"('revenue', (((COALESCE("last_12"."pnl", (0)::numeric) + COALESCE("last_12"."fee", (0)::numeric)) + COALESCE("last_12"."interest", (0)::numeric)) + COALESCE("last_12"."tax", (0)::numeric)), 'fee', COALESCE((- "last_12"."fee"), (0)::numeric), 'interest', COALESCE((- "last_12"."interest"), (0)::numeric), 'tax', COALESCE((- "last_12"."tax"), (0)::numeric), 'snapshot_date', ("last_12"."snapshot_date")::"text") ORDER BY "last_12"."snapshot_date") AS "jsonb_agg") AS "profit_chart"
           FROM ( SELECT "monthly_snapshots"."snapshot_date",
                    "monthly_snapshots"."pnl",
                    "monthly_snapshots"."interest",
                    "monthly_snapshots"."tax",
                    "monthly_snapshots"."fee"
                   FROM "public"."monthly_snapshots"
                  ORDER BY "monthly_snapshots"."snapshot_date" DESC
                 LIMIT 12) "last_12"
        ), "stock_positions" AS (
         SELECT "jsonb_agg"("jsonb_build_object"('ticker', "stock_holdings"."ticker", 'name', "stock_holdings"."name", 'logo_url', "stock_holdings"."logo_url", 'quantity', "stock_holdings"."quantity", 'cost_basis', "stock_holdings"."cost_basis", 'price', "stock_holdings"."price") ORDER BY "stock_holdings"."ticker") AS "stock_list"
           FROM "public"."stock_holdings"
        )
 SELECT "pnl"."pnl_ytd",
    "pnl"."pnl_mtd",
    "twr"."twr_ytd",
    "twr"."twr_all",
    "balance"."total_equity",
    "balance"."total_liabilities",
    "balance"."fund",
    "balance"."stock",
    "balance"."cash",
    "balance"."margin",
    "debt"."debts",
    "monthly"."total_pnl",
    "monthly"."avg_profit",
    "monthly"."avg_expense",
    "monthly"."profit_chart",
    "stock_positions"."stock_list",
    "equity_chart"."equitychart_3m",
    "equity_chart"."equitychart_6m",
    "equity_chart"."equitychart_1y",
    "equity_chart"."equitychart_all",
    "return_chart"."returnchart_3m",
    "return_chart"."returnchart_6m",
    "return_chart"."returnchart_1y",
    "return_chart"."returnchart_all"
   FROM ((((((("pnl"
     CROSS JOIN "twr")
     CROSS JOIN "balance")
     CROSS JOIN "debt")
     CROSS JOIN "monthly")
     CROSS JOIN "stock_positions")
     CROSS JOIN "equity_chart")
     CROSS JOIN "return_chart")
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."dashboard_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnse_orders" (
    "id" bigint NOT NULL,
    "side" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "order_status" "text",
    "fill_quantity" numeric,
    "average_price" numeric,
    "modified_date" timestamp with time zone DEFAULT "now"(),
    "tax" numeric(12,0),
    "fee" numeric
);


ALTER TABLE "public"."dnse_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_article_assets" (
    "article_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_article_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "source" "text" NOT NULL,
    "published_at" timestamp with time zone,
    "excerpt" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_annual_pnl" WITH ("security_invoker"='on') AS
 WITH "capital_legs" AS (
         SELECT "tl"."tx_id",
            ("tl"."credit" - "tl"."debit") AS "capital_amount",
            "t"."created_at"
           FROM (("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "t" ON (("t"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a_1" ON (("tl"."asset_id" = "a_1"."id")))
          WHERE ("a_1"."ticker" = 'CAPITAL'::"text")
        ), "stock_legs" AS (
         SELECT "tl"."tx_id",
            "tl"."asset_id" AS "stock_id"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."assets" "a_1" ON (("a_1"."id" = "tl"."asset_id")))
          WHERE ("a_1"."asset_class" = 'stock'::"public"."asset_class")
        )
 SELECT (EXTRACT(year FROM "c"."created_at"))::integer AS "year",
    "a"."ticker",
    "a"."name",
    "a"."logo_url",
    "sum"("c"."capital_amount") AS "total_pnl"
   FROM (("capital_legs" "c"
     JOIN "stock_legs" "s" ON (("s"."tx_id" = "c"."tx_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "s"."stock_id")))
  GROUP BY "a"."logo_url", "a"."name", "a"."ticker", (EXTRACT(year FROM "c"."created_at"));


ALTER VIEW "public"."stock_annual_pnl" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."yearly_snapshots" WITH ("security_invoker"='on') AS
 WITH "vn_asset" AS (
         SELECT "assets"."id"
           FROM "public"."assets"
          WHERE ("assets"."ticker" = 'VNINDEX'::"text")
        ), "annual_cashflow" AS (
         SELECT (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))::integer AS "year",
            "sum"(GREATEST("daily_snapshots"."net_cashflow", (0)::numeric)) AS "deposits",
            "sum"(LEAST("daily_snapshots"."net_cashflow", (0)::numeric)) AS "withdrawals"
           FROM "public"."daily_snapshots"
          GROUP BY ((EXTRACT(year FROM "daily_snapshots"."snapshot_date"))::integer)
        ), "equity_ranked" AS (
         SELECT (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))::integer AS "year",
            "daily_snapshots"."equity_index",
            "row_number"() OVER (PARTITION BY (EXTRACT(year FROM "daily_snapshots"."snapshot_date")) ORDER BY "daily_snapshots"."snapshot_date") AS "rn_start",
            "row_number"() OVER (PARTITION BY (EXTRACT(year FROM "daily_snapshots"."snapshot_date")) ORDER BY "daily_snapshots"."snapshot_date" DESC) AS "rn_end"
           FROM "public"."daily_snapshots"
          WHERE ("daily_snapshots"."equity_index" IS NOT NULL)
        ), "equity_returns" AS (
         SELECT "t"."year",
            "round"(
                CASE
                    WHEN ("t"."first_value" = (0)::numeric) THEN NULL::numeric
                    ELSE ((("t"."last_value" - "t"."first_value") / "t"."first_value") * (100)::numeric)
                END, 2) AS "equity_ret"
           FROM ( SELECT "equity_ranked"."year",
                    "max"("equity_ranked"."equity_index") FILTER (WHERE ("equity_ranked"."rn_start" = 1)) AS "first_value",
                    "max"("equity_ranked"."equity_index") FILTER (WHERE ("equity_ranked"."rn_end" = 1)) AS "last_value"
                   FROM "equity_ranked"
                  GROUP BY "equity_ranked"."year") "t"
        ), "vn_ranked" AS (
         SELECT (EXTRACT(year FROM "hp"."date"))::integer AS "year",
            "hp"."close",
            "row_number"() OVER (PARTITION BY (EXTRACT(year FROM "hp"."date")) ORDER BY "hp"."date") AS "rn_start",
            "row_number"() OVER (PARTITION BY (EXTRACT(year FROM "hp"."date")) ORDER BY "hp"."date" DESC) AS "rn_end"
           FROM ("public"."historical_prices" "hp"
             CROSS JOIN "vn_asset" "va")
          WHERE ("hp"."asset_id" = "va"."id")
        ), "vn_returns" AS (
         SELECT "t"."year",
            "round"(
                CASE
                    WHEN ("t"."first_value" = (0)::numeric) THEN NULL::numeric
                    ELSE ((("t"."last_value" - "t"."first_value") / "t"."first_value") * (100)::numeric)
                END, 2) AS "vn_ret"
           FROM ( SELECT "vn_ranked"."year",
                    "max"("vn_ranked"."close") FILTER (WHERE ("vn_ranked"."rn_start" = 1)) AS "first_value",
                    "max"("vn_ranked"."close") FILTER (WHERE ("vn_ranked"."rn_end" = 1)) AS "last_value"
                   FROM "vn_ranked"
                  GROUP BY "vn_ranked"."year") "t"
        ), "yearly_combined" AS (
         SELECT COALESCE("e"."year", "v"."year") AS "year",
            "e"."equity_ret",
            "v"."vn_ret"
           FROM ("equity_returns" "e"
             FULL JOIN "vn_returns" "v" USING ("year"))
        ), "all_time_cashflow" AS (
         SELECT "sum"(GREATEST("daily_snapshots"."net_cashflow", (0)::numeric)) AS "deposits",
            "sum"(LEAST("daily_snapshots"."net_cashflow", (0)::numeric)) AS "withdrawals"
           FROM "public"."daily_snapshots"
        ), "all_time_equity" AS (
         SELECT "round"(
                CASE
                    WHEN ("t2"."first_value" = (0)::numeric) THEN NULL::numeric
                    ELSE ((("t2"."last_value" - "t2"."first_value") / "t2"."first_value") * (100)::numeric)
                END, 2) AS "equity_ret"
           FROM ( SELECT "max"("t"."equity_index") FILTER (WHERE ("t"."rn_start" = 1)) AS "first_value",
                    "max"("t"."equity_index") FILTER (WHERE ("t"."rn_end" = 1)) AS "last_value"
                   FROM ( SELECT "daily_snapshots"."equity_index",
                            "row_number"() OVER (ORDER BY "daily_snapshots"."snapshot_date") AS "rn_start",
                            "row_number"() OVER (ORDER BY "daily_snapshots"."snapshot_date" DESC) AS "rn_end"
                           FROM "public"."daily_snapshots"
                          WHERE ("daily_snapshots"."equity_index" IS NOT NULL)) "t") "t2"
        ), "all_time_vn" AS (
         SELECT "round"(
                CASE
                    WHEN ("t2"."first_value" = (0)::numeric) THEN NULL::numeric
                    ELSE ((("t2"."last_value" - "t2"."first_value") / "t2"."first_value") * (100)::numeric)
                END, 2) AS "vn_ret"
           FROM ( SELECT "max"("t"."close") FILTER (WHERE ("t"."rn_start" = 1)) AS "first_value",
                    "max"("t"."close") FILTER (WHERE ("t"."rn_end" = 1)) AS "last_value"
                   FROM ( SELECT "hp"."close",
                            "row_number"() OVER (ORDER BY "hp"."date") AS "rn_start",
                            "row_number"() OVER (ORDER BY "hp"."date" DESC) AS "rn_end"
                           FROM ("public"."historical_prices" "hp"
                             CROSS JOIN "vn_asset" "va")
                          WHERE ("hp"."asset_id" = "va"."id")) "t") "t2"
        ), "all_time" AS (
         SELECT 9999 AS "year",
            "atc"."deposits",
            "atc"."withdrawals",
            "ate"."equity_ret",
            "atv"."vn_ret"
           FROM (("all_time_cashflow" "atc"
             CROSS JOIN "all_time_equity" "ate")
             CROSS JOIN "all_time_vn" "atv")
        )
 SELECT "yc"."year",
    "ac"."deposits",
    "ac"."withdrawals",
    "yc"."equity_ret",
    "yc"."vn_ret"
   FROM ("yearly_combined" "yc"
     LEFT JOIN "annual_cashflow" "ac" USING ("year"))
UNION ALL
 SELECT "all_time"."year",
    "all_time"."deposits",
    "all_time"."withdrawals",
    "all_time"."equity_ret",
    "all_time"."vn_ret"
   FROM "all_time"
  ORDER BY 1;


ALTER VIEW "public"."yearly_snapshots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reports_data" AS
 WITH "stock_base" AS (
         SELECT "stock_annual_pnl"."year",
            "jsonb_agg"("jsonb_build_object"('ticker', "stock_annual_pnl"."ticker", 'name', "stock_annual_pnl"."name", 'logo_url', "stock_annual_pnl"."logo_url", 'total_pnl', "stock_annual_pnl"."total_pnl") ORDER BY "stock_annual_pnl"."ticker") AS "stock_pnl"
           FROM "public"."stock_annual_pnl"
          GROUP BY "stock_annual_pnl"."year"
        ), "stock_all_time" AS (
         SELECT 9999 AS "year",
            "jsonb_agg"("jsonb_build_object"('ticker', "agg"."ticker", 'name', "agg"."name", 'logo_url', "agg"."logo_url", 'total_pnl', "agg"."total_pnl") ORDER BY "agg"."ticker") AS "stock_pnl"
           FROM ( SELECT "stock_annual_pnl"."ticker",
                    "stock_annual_pnl"."name",
                    "stock_annual_pnl"."logo_url",
                    "sum"("stock_annual_pnl"."total_pnl") AS "total_pnl"
                   FROM "public"."stock_annual_pnl"
                  GROUP BY "stock_annual_pnl"."ticker", "stock_annual_pnl"."name", "stock_annual_pnl"."logo_url") "agg"
        ), "profit_base" AS (
         SELECT (EXTRACT(year FROM "monthly_snapshots"."snapshot_date"))::integer AS "year",
            "sum"("monthly_snapshots"."pnl") AS "total_pnl",
            "avg"("monthly_snapshots"."pnl") AS "avg_profit",
            (- "avg"((("monthly_snapshots"."interest" + "monthly_snapshots"."tax") + "monthly_snapshots"."fee"))) AS "avg_expense",
            "jsonb_agg"("jsonb_build_object"('revenue', (((COALESCE("monthly_snapshots"."pnl", (0)::numeric) + COALESCE("monthly_snapshots"."fee", (0)::numeric)) + COALESCE("monthly_snapshots"."interest", (0)::numeric)) + COALESCE("monthly_snapshots"."tax", (0)::numeric)), 'fee', COALESCE((- "monthly_snapshots"."fee"), (0)::numeric), 'interest', COALESCE((- "monthly_snapshots"."interest"), (0)::numeric), 'tax', COALESCE((- "monthly_snapshots"."tax"), (0)::numeric), 'snapshot_date', ("monthly_snapshots"."snapshot_date")::"text") ORDER BY "monthly_snapshots"."snapshot_date") AS "profit_chart"
           FROM "public"."monthly_snapshots"
          GROUP BY (EXTRACT(year FROM "monthly_snapshots"."snapshot_date"))
        ), "profit_all_time" AS (
         SELECT 9999 AS "year",
            "sum"("yearly"."sum_pnl") AS "total_pnl",
            "avg"("yearly"."sum_pnl") AS "avg_profit",
            (- "avg"((("yearly"."sum_interest" + "yearly"."sum_tax") + "yearly"."sum_fee"))) AS "avg_expense",
            "jsonb_agg"("jsonb_build_object"('revenue', (((COALESCE("yearly"."sum_pnl", (0)::numeric) + COALESCE("yearly"."sum_fee", (0)::numeric)) + COALESCE("yearly"."sum_interest", (0)::numeric)) + COALESCE("yearly"."sum_tax", (0)::numeric)), 'fee', COALESCE((- "yearly"."sum_fee"), (0)::numeric), 'interest', COALESCE((- "yearly"."sum_interest"), (0)::numeric), 'tax', COALESCE((- "yearly"."sum_tax"), (0)::numeric), 'snapshot_date', ("yearly"."year")::"text") ORDER BY "yearly"."year") AS "profit_chart"
           FROM ( SELECT (EXTRACT(year FROM "monthly_snapshots"."snapshot_date"))::integer AS "year",
                    "sum"("monthly_snapshots"."pnl") AS "sum_pnl",
                    "sum"("monthly_snapshots"."fee") AS "sum_fee",
                    "sum"("monthly_snapshots"."interest") AS "sum_interest",
                    "sum"("monthly_snapshots"."tax") AS "sum_tax"
                   FROM "public"."monthly_snapshots"
                  GROUP BY (EXTRACT(year FROM "monthly_snapshots"."snapshot_date"))) "yearly"
        ), "date_bounds" AS (
         SELECT "y"."year",
                CASE
                    WHEN ("y"."year" = 9999) THEN ( SELECT "min"("daily_snapshots"."snapshot_date") AS "min"
                       FROM "public"."daily_snapshots")
                    ELSE "make_date"("y"."year", 1, 1)
                END AS "start_date",
                CASE
                    WHEN ("y"."year" = 9999) THEN ( SELECT "max"("daily_snapshots"."snapshot_date") AS "max"
                       FROM "public"."daily_snapshots")
                    ELSE "make_date"("y"."year", 12, 31)
                END AS "end_date"
           FROM ( SELECT "stock_base"."year"
                   FROM "stock_base"
                UNION
                 SELECT "stock_all_time"."year"
                   FROM "stock_all_time") "y"
        ), "combined" AS (
         SELECT "b"."year",
            "b"."stock_pnl",
            "p"."total_pnl",
            "p"."avg_profit",
            "p"."avg_expense",
            "p"."profit_chart",
            "ys"."deposits",
            "ys"."withdrawals",
            "ys"."equity_ret",
            "ys"."vn_ret"
           FROM (("stock_base" "b"
             LEFT JOIN "profit_base" "p" USING ("year"))
             LEFT JOIN "public"."yearly_snapshots" "ys" USING ("year"))
        UNION ALL
         SELECT "s"."year",
            "s"."stock_pnl",
            "p"."total_pnl",
            "p"."avg_profit",
            "p"."avg_expense",
            "p"."profit_chart",
            "ys"."deposits",
            "ys"."withdrawals",
            "ys"."equity_ret",
            "ys"."vn_ret"
           FROM (("stock_all_time" "s"
             LEFT JOIN "profit_all_time" "p" USING ("year"))
             LEFT JOIN "public"."yearly_snapshots" "ys" USING ("year"))
        )
 SELECT "c"."year",
    "c"."stock_pnl",
    "c"."total_pnl",
    "c"."avg_profit",
    "c"."avg_expense",
    "c"."profit_chart",
    "c"."deposits",
    "c"."withdrawals",
    "c"."equity_ret",
    "c"."vn_ret",
    "public"."get_return_chart"("db"."start_date", "db"."end_date", 150) AS "return_chart"
   FROM ("combined" "c"
     JOIN "date_bounds" "db" USING ("year"))
  ORDER BY "c"."year";


ALTER VIEW "public"."reports_data" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tx_summary" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."created_at",
    "t"."category",
        CASE
            WHEN ("t"."category" = 'stock'::"text") THEN "s"."side"
            WHEN ("t"."category" = 'cashflow'::"text") THEN ("cf"."operation")::"text"
            ELSE "d"."operation"
        END AS "operation",
        CASE
            WHEN ("t"."category" = 'stock'::"text") THEN "s"."net_proceed"
            WHEN ("t"."category" = 'cashflow'::"text") THEN "cf"."net_proceed"
            ELSE "d"."net_proceed"
        END AS "value",
    "t"."memo"
   FROM ((("public"."tx_entries" "t"
     LEFT JOIN "public"."tx_stock" "s" ON (("t"."id" = "s"."tx_id")))
     LEFT JOIN "public"."tx_cashflow" "cf" ON (("t"."id" = "cf"."tx_id")))
     LEFT JOIN "public"."tx_debt" "d" ON (("t"."id" = "d"."tx_id")));


ALTER VIEW "public"."tx_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_ticker_key" UNIQUE ("ticker");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."historical_prices"
    ADD CONSTRAINT "daily_security_prices_pkey" PRIMARY KEY ("asset_id", "date");



ALTER TABLE ONLY "public"."dnse_orders"
    ADD CONSTRAINT "dnse_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency_code", "date");



ALTER TABLE ONLY "public"."daily_market_indices"
    ADD CONSTRAINT "market_data_pkey" PRIMARY KEY ("date", "symbol");



ALTER TABLE ONLY "public"."news_article_assets"
    ADD CONSTRAINT "news_article_assets_pkey" PRIMARY KEY ("article_id", "asset_id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."asset_positions"
    ADD CONSTRAINT "stock_positions_pkey" PRIMARY KEY ("asset_id");



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."tx_debt"
    ADD CONSTRAINT "tx_debt_pkey" PRIMARY KEY ("tx_id");



ALTER TABLE ONLY "public"."tx_entries"
    ADD CONSTRAINT "tx_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_pkey" PRIMARY KEY ("tx_id", "asset_id");



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_pkey" PRIMARY KEY ("tx_id");



CREATE UNIQUE INDEX "daily_snapshots_snapshot_date_idx" ON "public"."daily_snapshots" USING "btree" ("snapshot_date");



CREATE INDEX "tx_legs_asset_id_idx" ON "public"."tx_legs" USING "btree" ("asset_id");



CREATE OR REPLACE VIEW "public"."balance_sheet" WITH ("security_invoker"='on') AS
 WITH "stock" AS (
         SELECT "a"."ticker",
            ("sum"("tl"."debit") - "sum"("tl"."credit")) AS "cost_basis",
            "sum"((("tl"."quantity" * COALESCE("sp"."price", (1)::numeric)) * COALESCE("er"."rate", (1)::numeric))) AS "market_value"
           FROM ((("public"."assets" "a"
             JOIN "public"."tx_legs" "tl" ON (("a"."id" = "tl"."asset_id")))
             LEFT JOIN LATERAL ( SELECT "historical_prices"."close" AS "price"
                   FROM "public"."historical_prices"
                  WHERE ("historical_prices"."asset_id" = "a"."id")
                  ORDER BY "historical_prices"."date" DESC
                 LIMIT 1) "sp" ON (true))
             LEFT JOIN LATERAL ( SELECT "daily_exchange_rates"."rate"
                   FROM "public"."daily_exchange_rates"
                  WHERE ("daily_exchange_rates"."currency_code" = "a"."currency_code")
                  ORDER BY "daily_exchange_rates"."date" DESC
                 LIMIT 1) "er" ON (true))
          WHERE ("a"."asset_class" = ANY (ARRAY['stock'::"public"."asset_class", 'fund'::"public"."asset_class"]))
          GROUP BY "a"."ticker"
        ), "debt_interest" AS (
         SELECT COALESCE("sum"(("d"."principal" * ("power"(((1)::numeric + (("d"."rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "e"."created_at"))) - (1)::numeric))), (0)::numeric) AS "coalesce"
           FROM ("public"."tx_debt" "d"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
          WHERE (("d"."operation" = 'borrow'::"text") AND (NOT (EXISTS ( SELECT 1
                   FROM "public"."tx_debt" "x"
                  WHERE ("x"."repay_tx" = "d"."tx_id")))))
        ), "pnl" AS (
         SELECT (("sum"("s_1"."market_value") - "sum"("s_1"."cost_basis")) - ( SELECT "debt_interest"."coalesce"
                   FROM "debt_interest")) AS "?column?"
           FROM "stock" "s_1"
        ), "margin" AS (
         SELECT GREATEST((- "sum"("tl"."quantity")), (0)::numeric) AS "greatest"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE ("a"."ticker" = 'FX.VND'::"text")
        ), "asset_quantity" AS (
         SELECT "a"."ticker",
            "a"."name",
            "a"."asset_class",
                CASE
                    WHEN ("a"."ticker" = 'INTERESTS'::"text") THEN ( SELECT "debt_interest"."coalesce"
                       FROM "debt_interest")
                    WHEN ("a"."ticker" = 'UNREALIZED'::"text") THEN ( SELECT "pnl"."?column?"
                       FROM "pnl")
                    WHEN ("a"."ticker" = 'MARGIN'::"text") THEN ( SELECT "margin"."greatest"
                       FROM "margin")
                    ELSE GREATEST("sum"("tl"."quantity"), (0)::numeric)
                END AS "quantity"
           FROM ("public"."assets" "a"
             LEFT JOIN "public"."tx_legs" "tl" ON (("tl"."asset_id" = "a"."id")))
          WHERE ("a"."asset_class" <> 'index'::"public"."asset_class")
          GROUP BY "a"."id", "a"."ticker", "a"."asset_class"
        )
 SELECT "aq"."ticker",
    "aq"."name",
    "aq"."asset_class",
    "aq"."quantity",
        CASE
            WHEN ("aq"."asset_class" = ANY (ARRAY['stock'::"public"."asset_class", 'fund'::"public"."asset_class"])) THEN "s"."market_value"
            ELSE "aq"."quantity"
        END AS "total_value"
   FROM ("asset_quantity" "aq"
     LEFT JOIN "stock" "s" ON (("aq"."ticker" = "s"."ticker")))
  WHERE (("aq"."quantity" > (0)::numeric) OR ("aq"."asset_class" <> 'stock'::"public"."asset_class"))
  ORDER BY "aq"."asset_class";



CREATE OR REPLACE TRIGGER "after_dnse_order_insert" AFTER INSERT ON "public"."dnse_orders" FOR EACH ROW EXECUTE FUNCTION "public"."process_dnse_order"();



CREATE OR REPLACE TRIGGER "trg_process_tx_cashflow" AFTER INSERT ON "public"."tx_cashflow" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_cashflow_func"();



CREATE OR REPLACE TRIGGER "trg_process_tx_debt" AFTER INSERT ON "public"."tx_debt" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_debt_func"();



CREATE OR REPLACE TRIGGER "trg_process_tx_stock" AFTER INSERT ON "public"."tx_stock" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_stock_func"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_cashflow_update" AFTER UPDATE ON "public"."tx_cashflow" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_debt_update" AFTER UPDATE ON "public"."tx_debt" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_stock_update" AFTER UPDATE ON "public"."tx_stock" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_currency_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."historical_prices"
    ADD CONSTRAINT "daily_security_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dnse_orders"
    ADD CONSTRAINT "dnse_orders_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."assets"("ticker") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_article_assets"
    ADD CONSTRAINT "news_article_assets_article_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_article_assets"
    ADD CONSTRAINT "news_article_assets_asset_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_positions"
    ADD CONSTRAINT "stock_positions_stock_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_cashflow"
    ADD CONSTRAINT "tx_cashflow_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_debt"
    ADD CONSTRAINT "tx_debt_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_legs"
    ADD CONSTRAINT "tx_legs_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."tx_stock"
    ADD CONSTRAINT "tx_stock_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "public"."tx_entries"("id") ON DELETE CASCADE;



CREATE POLICY "Access for authenticated users" ON "public"."asset_positions" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."news_article_assets" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."news_articles" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_cashflow" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_debt" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_entries" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_legs" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_stock" TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can access exchange rates" ON "public"."daily_exchange_rates" TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can access market indices" ON "public"."daily_market_indices" TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can access stock prices" ON "public"."historical_prices" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access assets" ON "public"."assets" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access currency" ON "public"."currencies" TO "authenticated" USING (true);



CREATE POLICY "Users can read DNSE orders" ON "public"."dnse_orders" TO "authenticated" USING (true);



ALTER TABLE "public"."asset_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_market_indices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnse_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historical_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_article_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_cashflow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_debt" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_legs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tx_stock" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
























































































































































































































GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_borrow_event"("p_principal" numeric, "p_lender" "text", "p_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_repay_event"("p_repay_tx" "uuid", "p_interest" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_stock_event"("p_side" "text", "p_ticker" "text", "p_price" numeric, "p_quantity" numeric, "p_fee" numeric, "p_tax" numeric) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow_func"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow_func"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_cashflow_func"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_debt_func"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_debt_func"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_debt_func"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_process_tx_stock_func"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_process_tx_stock_func"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_process_tx_stock_func"() TO "service_role";






























GRANT ALL ON TABLE "public"."asset_positions" TO "anon";
GRANT ALL ON TABLE "public"."asset_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_positions" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."balance_sheet" TO "anon";
GRANT ALL ON TABLE "public"."balance_sheet" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_sheet" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."daily_market_indices" TO "anon";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "service_role";



GRANT ALL ON TABLE "public"."historical_prices" TO "anon";
GRANT ALL ON TABLE "public"."historical_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_prices" TO "service_role";



GRANT ALL ON TABLE "public"."tx_cashflow" TO "anon";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "service_role";



GRANT ALL ON TABLE "public"."tx_debt" TO "anon";
GRANT ALL ON TABLE "public"."tx_debt" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_debt" TO "service_role";



GRANT ALL ON TABLE "public"."tx_entries" TO "anon";
GRANT ALL ON TABLE "public"."tx_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tx_legs" TO "anon";
GRANT ALL ON TABLE "public"."tx_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_legs" TO "service_role";



GRANT ALL ON TABLE "public"."daily_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."tx_stock" TO "anon";
GRANT ALL ON TABLE "public"."tx_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_stock" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."outstanding_debts" TO "anon";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "authenticated";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "service_role";



GRANT ALL ON TABLE "public"."stock_holdings" TO "anon";
GRANT ALL ON TABLE "public"."stock_holdings" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_holdings" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_data" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_data" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_data" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_orders" TO "anon";
GRANT ALL ON TABLE "public"."dnse_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_orders" TO "service_role";



GRANT ALL ON TABLE "public"."news_article_assets" TO "anon";
GRANT ALL ON TABLE "public"."news_article_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."news_article_assets" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "anon";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "service_role";



GRANT ALL ON TABLE "public"."yearly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."yearly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."yearly_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."reports_data" TO "anon";
GRANT ALL ON TABLE "public"."reports_data" TO "authenticated";
GRANT ALL ON TABLE "public"."reports_data" TO "service_role";



GRANT ALL ON TABLE "public"."tx_summary" TO "anon";
GRANT ALL ON TABLE "public"."tx_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_summary" TO "service_role";









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

