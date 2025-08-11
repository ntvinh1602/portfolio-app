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
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE TYPE "public"."account_type" AS ENUM (
    'brokerage',
    'crypto_exchange',
    'epf',
    'bank',
    'wallet',
    'conceptual'
);
CREATE TYPE "public"."asset_class" AS ENUM (
    'cash',
    'stock',
    'crypto',
    'epf',
    'equity',
    'liability'
);
CREATE TYPE "public"."currency_type" AS ENUM (
    'fiat',
    'crypto'
);
CREATE TYPE "public"."debt_status" AS ENUM (
    'active',
    'paid_off'
);
CREATE TYPE "public"."tax_lot_origin" AS ENUM (
    'purchase',
    'split',
    'deposit'
);
CREATE TYPE "public"."transaction_type" AS ENUM (
    'buy',
    'sell',
    'deposit',
    'withdraw',
    'expense',
    'income',
    'dividend',
    'debt_payment',
    'split',
    'borrow'
);
CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
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
    SELECT net_equity_value INTO v_start_equity
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date < p_start_date
    ORDER BY date DESC
    LIMIT 1;
    -- If no prior snapshot, this is the first month.
    -- Use the opening equity of the first day as the starting equity.
    IF v_start_equity IS NULL THEN
        SELECT (net_equity_value - net_cash_flow) INTO v_start_equity
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date >= p_start_date
        ORDER BY date ASC
        LIMIT 1;
    END IF;
    -- Get ending equity (closing equity of the end date)
    SELECT net_equity_value INTO v_end_equity
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date <= p_end_date
    ORDER BY date DESC
    LIMIT 1;
    -- Get net cash flow for the period
    SELECT COALESCE(SUM(net_cash_flow), 0) INTO v_cash_flow
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date >= p_start_date AND date <= p_end_date;
    -- Calculate PnL
    v_pnl := (COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow;
    RETURN v_pnl;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
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
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date < p_start_date
    ORDER BY date DESC
    LIMIT 1;
    -- If no prior snapshot, this is the first month.
    -- The starting index is conceptually 100 before the first day.
    IF v_start_index IS NULL THEN
        v_start_index := 100;
    END IF;
    -- Get the equity index at the end of the period
    SELECT equity_index INTO v_end_index
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date <= p_end_date
    ORDER BY date DESC
    LIMIT 1;
    -- If there's no data for the period, return 0
    IF v_end_index IS NULL THEN
        RETURN 0;
    END IF;
    -- Calculate TWR as the percentage change in the equity index
    v_twr := (v_end_index / v_start_index) - 1;
    RETURN v_twr;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  token text;
begin
  -- Get the token from Vault
  token := vault.get_secret('vercel_revalidate_token');
  -- Call the Supabase HTTP function
  perform supabase_functions.http_request(
    'https://portapp-vinh.vercel.app/api/revalidate',
    'POST',
    format('{"x-secret-token":"%s"}', token),
    '{}',
    '5000'
  );
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  loop_date date;
  v_total_assets_value numeric;
  v_total_liabilities_value numeric;
  v_net_cash_flow numeric;
  v_net_equity_value numeric;
  v_previous_equity_value numeric;
  v_previous_equity_index numeric;
  v_daily_return numeric;
  v_equity_index numeric;
BEGIN
  FOR loop_date IN SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date LOOP
    -- Skip weekends
    IF EXTRACT(ISODOW FROM loop_date) IN (6, 7) THEN CONTINUE;
    END IF;
    -- Calculate total assets value for the day
    WITH user_assets AS (
      SELECT
        a.security_id,
        s.asset_class,
        s.currency_code,
        SUM(tl.quantity) as total_quantity
      FROM transaction_legs tl
      JOIN transactions t ON tl.transaction_id = t.id
      JOIN assets a ON tl.asset_id = a.id
      JOIN securities s ON a.security_id = s.id
      WHERE a.user_id = p_user_id
        AND t.transaction_date <= loop_date
        AND s.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.security_id, s.asset_class, s.currency_code
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN ua.asset_class = 'stock' THEN ua.total_quantity * sdp.price
        WHEN ua.asset_class = 'crypto' THEN ua.total_quantity * COALESCE(dcp.price, 0) * COALESCE(er_usd.rate, 1)
        ELSE ua.total_quantity * COALESCE(er.rate, 1)
      END
    ), 0)
    INTO v_total_assets_value
    FROM user_assets ua
    LEFT JOIN LATERAL (
      SELECT price FROM daily_stock_prices
      WHERE security_id = ua.security_id AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) sdp ON ua.asset_class = 'stock'
    LEFT JOIN LATERAL (
      SELECT price FROM daily_crypto_prices
      WHERE security_id = ua.security_id AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) dcp ON ua.asset_class = 'crypto'
    LEFT JOIN LATERAL (
      SELECT rate FROM daily_exchange_rates
      WHERE currency_code = ua.currency_code AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) er ON ua.asset_class NOT IN ('stock', 'crypto')
    LEFT JOIN LATERAL (
      SELECT rate FROM daily_exchange_rates
      WHERE currency_code = 'USD' AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) er_usd ON ua.asset_class = 'crypto';
    -- Calculate total liabilities value for the day
    WITH historical_debt_balances AS (
      SELECT
        d.id,
        d.principal_amount,
        d.interest_rate,
        d.start_date,
        (
          SELECT COALESCE(SUM(tl.amount), 0)
          FROM transaction_legs tl
          JOIN transactions t ON tl.transaction_id = t.id
          JOIN assets a ON tl.asset_id = a.id
          JOIN securities s ON a.security_id = s.id
          WHERE t.related_debt_id = d.id
            AND t.user_id = p_user_id
            AND t.transaction_date <= loop_date
            AND s.ticker = 'DEBTS'
        ) AS balance_at_date
      FROM debts d
      WHERE d.user_id = p_user_id
        AND d.start_date <= loop_date
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN hdb.balance_at_date < 0 THEN
          ABS(hdb.balance_at_date) + (hdb.principal_amount * (POWER(1 + (hdb.interest_rate / 100 / 365), (loop_date - hdb.start_date)) - 1))
        ELSE 0
      END
    ), 0)
    INTO v_total_liabilities_value
    FROM historical_debt_balances hdb;
    -- Calculate net cash flow for the day
    SELECT COALESCE(SUM(tl.amount), 0)
    INTO v_net_cash_flow
    FROM transactions t
    JOIN transaction_legs tl ON t.id = tl.transaction_id
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE t.user_id = p_user_id
      AND t.transaction_date = loop_date
      AND t.type IN ('deposit', 'withdraw')
      AND s.asset_class IN ('cash', 'epf');
    v_net_equity_value := v_total_assets_value - v_total_liabilities_value;
    -- Calculate Equity Index
    SELECT net_equity_value, equity_index
    INTO v_previous_equity_value, v_previous_equity_index
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date < loop_date
    ORDER BY date DESC
    LIMIT 1;
    
    IF v_previous_equity_value IS NULL THEN
      v_equity_index := 100; -- The first snapshot for the user
    ELSE
      -- Calculate daily return and chain the index
      IF v_previous_equity_value = 0 THEN
        v_daily_return := 0; -- Avoid division by zero
      ELSE
        v_daily_return := (v_net_equity_value - v_net_cash_flow - v_previous_equity_value) / v_previous_equity_value;
      END IF;
      v_equity_index := v_previous_equity_index * (1 + v_daily_return);
    END IF;
    -- Insert or update the snapshot for the day
    INSERT INTO daily_performance_snapshots (user_id, date, net_equity_value, net_cash_flow, equity_index)
    VALUES (
      p_user_id,
      loop_date,
      v_net_equity_value,
      v_net_cash_flow,
      v_equity_index)
    ON CONFLICT (user_id, date) DO UPDATE
    SET net_equity_value = excluded.net_equity_value,
      net_cash_flow = excluded.net_cash_flow,
      equity_index = excluded.equity_index;
  END LOOP;
END;
$$;
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lender_name" "text" NOT NULL,
    "principal_amount" numeric(16,4) NOT NULL,
    "currency_code" character varying(10) NOT NULL,
    "interest_rate" numeric(4,2) DEFAULT 0 NOT NULL,
    "start_date" "date" NOT NULL,
    "status" "public"."debt_status" NOT NULL
);
CREATE OR REPLACE FUNCTION "public"."get_active_debts"("p_user_id" "uuid") RETURNS SETOF "public"."debts"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select *
  from debts
  where status = 'active' and user_id = p_user_id;
$$;
CREATE OR REPLACE FUNCTION "public"."get_asset_account_data"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    accounts_data jsonb;
    assets_data jsonb;
BEGIN
    -- Fetch accounts data
    SELECT jsonb_agg(accounts)
    INTO accounts_data
    FROM accounts
    WHERE user_id = p_user_id AND type != 'conceptual';
    -- Fetch assets data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'user_id', a.user_id,
            'security_id', a.security_id,
            'securities', to_jsonb(s)
        )
    )
    INTO assets_data
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability');
    RETURN jsonb_build_object(
        'accounts', accounts_data,
        'assets', assets_data
    );
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);
    RETURN v_balance;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
  -- Cost basis values
  asset_cb_by_class jsonb;
  total_assets_cb numeric;
  
  -- Market value values
  asset_mv_by_class jsonb;
  total_assets_mv numeric;
  
  -- Liability values
  debts_principal numeric;
  accrued_interest numeric;
  liability_total numeric;
  
  -- Equity values
  owner_capital numeric;
  unrealized_pl numeric;
  equity_total numeric;
BEGIN
  -- Calculate cost basis totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(cb_totals.asset_class, cb_totals.total), '{}'::jsonb)
  INTO asset_cb_by_class
  FROM (
    SELECT s.asset_class, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as cb_totals;
  -- Calculate market value totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(mv_totals.asset_class, mv_totals.total), '{}'::jsonb)
  INTO asset_mv_by_class
  FROM (
    SELECT
      s.asset_class,
      SUM(
        CASE
          WHEN s.asset_class = 'stock' THEN a.current_quantity * COALESCE(public.get_latest_stock_price(s.id), 0)
          WHEN s.asset_class = 'crypto' THEN a.current_quantity * COALESCE(public.get_latest_crypto_price(s.id), 0) * COALESCE(public.get_latest_exchange_rate('USD'), 1)
          ELSE a.current_quantity * COALESCE(public.get_latest_exchange_rate(s.currency_code), 1)
        END
      ) AS total
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as mv_totals;
  -- Calculate total asset cost basis
  total_assets_cb := (coalesce((asset_cb_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'crypto')::numeric, 0));
  -- Calculate total asset market value
  total_assets_mv := (coalesce((asset_mv_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'crypto')::numeric, 0));
  -- Calculate liability values
  SELECT a.current_quantity * -1 INTO debts_principal
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'DEBTS' AND a.user_id = p_user_id;
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM debts d
  WHERE d.user_id = p_user_id AND d.status = 'active';
  liability_total := debts_principal + accrued_interest;
  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  unrealized_pl := total_assets_mv - total_assets_cb - accrued_interest;
  equity_total := owner_capital + unrealized_pl;
  
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_mv_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_mv_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_mv_by_class->>'epf')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_mv_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', total_assets_mv,
    'liabilities', json_build_array(
      json_build_object('type', 'Debts Principal', 'totalAmount', debts_principal),
      json_build_object('type', 'Accrued Interest', 'totalAmount', accrued_interest)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Owner Capital', 'totalAmount', owner_capital),
      json_build_object('type', 'Unrealized P/L', 'totalAmount', unrealized_pl)
    ),
    'totalEquity', equity_total
  ) INTO result;
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "text", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_first_portfolio_value numeric;
    v_first_vni_value numeric;
    data_count INT;
    -- LTTB implementation variables
    data RECORD;
    result_data RECORD;
    avg_x NUMERIC;
    avg_y NUMERIC;
    range_start INT;
    range_end INT;
    point_area NUMERIC;
    max_area NUMERIC;
    point_to_add RECORD;
    every NUMERIC;
    i INT;
    a INT := 0;
BEGIN
    -- Step 1: Find the first available values on or after the start date for normalization
    SELECT dps.equity_index INTO v_first_portfolio_value
    FROM daily_performance_snapshots dps
    WHERE dps.user_id = p_user_id AND dps.date >= p_start_date
    ORDER BY dps.date
    LIMIT 1;
    SELECT md.close INTO v_first_vni_value
    FROM daily_market_indices md
    WHERE md.symbol = '^VNINDEX' AND md.date >= p_start_date
    ORDER BY md.date
    LIMIT 1;
    -- Create a temporary table to hold the raw, joined, and normalized data
    CREATE TEMP TABLE raw_data AS
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as day
    ),
    portfolio_data AS (
        SELECT
            dps.date,
            dps.equity_index
        FROM daily_performance_snapshots dps
        WHERE dps.user_id = p_user_id AND dps.date BETWEEN p_start_date AND p_end_date
    ),
    vni_data AS (
        SELECT
            md.date,
            md.close
        FROM daily_market_indices md
        WHERE md.symbol = '^VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
    )
    SELECT
        ds.day as date,
        (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 as portfolio_value,
        (vni.close / NULLIF(v_first_vni_value, 0)) * 100 as vni_value,
        ROW_NUMBER() OVER (ORDER BY ds.day) as rn
    FROM date_series ds
    LEFT JOIN portfolio_data pd ON ds.day = pd.date
    LEFT JOIN vni_data vni ON ds.day = vni.date
    WHERE pd.equity_index IS NOT NULL OR vni.close IS NOT NULL
    ORDER BY ds.day;
    SELECT COUNT(*) INTO data_count FROM raw_data;
    -- If the data count is below the threshold, return all points
    IF data_count <= p_threshold THEN
        RETURN QUERY SELECT to_char(rd.date, 'YYYY-MM-DD'), rd.portfolio_value, rd.vni_value FROM raw_data rd;
        DROP TABLE raw_data;
        RETURN;
    END IF;
    -- LTTB Downsampling
    CREATE TEMP TABLE result_data_temp (
        date DATE,
        portfolio_value NUMERIC,
        vni_value NUMERIC
    );
    -- Always add the first point
    INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = 1;
    every := (data_count - 2.0) / (p_threshold - 2.0);
    FOR i IN 0..p_threshold - 3 LOOP
        -- Calculate average for the next bucket
        range_start := floor(a * every) + 2;
        range_end := floor((a + 1) * every) + 1;
        -- Ensure range_end does not exceed data_count
        IF range_end > data_count THEN
            range_end := data_count;
        END IF;
        
        -- Ensure range_start is not greater than range_end
        IF range_start > range_end THEN
            CONTINUE;
        END IF;
        SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        SELECT AVG(rd.portfolio_value) INTO avg_y FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        -- Find the point with the largest triangle area based on portfolio_value
        max_area := -1;
        -- Get the last point added to the results
        SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;
        FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
            point_area := abs(
                (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.portfolio_value - result_data.portfolio_value) -
                (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.portfolio_value)
            ) * 0.5;
            IF point_area > max_area THEN
                max_area := point_area;
                point_to_add := data;
            END IF;
        END LOOP;
        -- Add the selected point to the results
        INSERT INTO result_data_temp (date, portfolio_value, vni_value)
        VALUES (point_to_add.date, point_to_add.portfolio_value, point_to_add.vni_value);
        a := a + 1;
    END LOOP;
    -- Always add the last point
    INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = data_count;
    RETURN QUERY SELECT to_char(r.date, 'YYYY-MM-DD'), r.portfolio_value, r.vni_value FROM result_data_temp r ORDER BY r.date;
    DROP TABLE raw_data;
    DROP TABLE result_data_temp;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.ticker,
        s.name,
        s.logo_url AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        public.get_latest_crypto_price(s.id) AS latest_price,
        public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'crypto' AND a.user_id = p_user_id
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    data_count INT;
    -- LTTB implementation variables
    data RECORD;
    result_data RECORD;
    avg_x NUMERIC;
    avg_y NUMERIC;
    range_start INT;
    range_end INT;
    point_area NUMERIC;
    max_area NUMERIC;
    point_to_add RECORD;
    every NUMERIC;
    i INT;
    a INT := 0;
BEGIN
    -- Create a temporary table to hold the raw data, casting the value to numeric
    CREATE TEMP TABLE raw_data AS
    SELECT
        dps.date,
        dps.net_equity_value::numeric as net_equity_value,
        ROW_NUMBER() OVER (ORDER BY dps.date) as rn
    FROM
        daily_performance_snapshots dps
    WHERE
        dps.user_id = p_user_id
        AND dps.date >= p_start_date
        AND dps.date <= p_end_date
    ORDER BY
        dps.date;
    SELECT COUNT(*) INTO data_count FROM raw_data;
    -- If the data count is below the threshold, return all points
    IF data_count <= p_threshold THEN
        RETURN QUERY SELECT rd.date, rd.net_equity_value FROM raw_data rd;
        DROP TABLE raw_data;
        RETURN;
    END IF;
    -- LTTB Downsampling
    CREATE TEMP TABLE result_data_temp (
        date DATE,
        net_equity_value NUMERIC
    );
    -- Always add the first point
    INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = 1;
    every := (data_count - 2.0) / (p_threshold - 2.0);
    FOR i IN 0..p_threshold - 3 LOOP
        -- Calculate average for the next bucket
        range_start := floor(a * every) + 2;
        range_end := floor((a + 1) * every) + 1;
        SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        SELECT AVG(rd.net_equity_value) INTO avg_y FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        -- Find the point with the largest triangle area
        max_area := -1;
        -- Get the last point added to the results
        SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;
        FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
            point_area := abs(
                (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.net_equity_value - result_data.net_equity_value) -
                (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.net_equity_value)
            ) * 0.5;
            IF point_area > max_area THEN
                max_area := point_area;
                point_to_add := data;
            END IF;
        END LOOP;
        -- Add the selected point to the results
        INSERT INTO result_data_temp (date, net_equity_value)
        VALUES (point_to_add.date, point_to_add.net_equity_value);
        a := a + 1;
    END LOOP;
    -- Always add the last point
    INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = data_count;
    RETURN QUERY SELECT * FROM result_data_temp ORDER BY date;
    DROP TABLE raw_data;
    DROP TABLE result_data_temp;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT price
  INTO latest_price
  FROM public.daily_crypto_prices
  WHERE security_id = p_security_id
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_price;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  latest_rate NUMERIC;
BEGIN
  SELECT rate
  INTO latest_rate
  FROM public.daily_exchange_rates
  WHERE currency_code = p_currency_code
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_rate;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT price
  INTO latest_price
  FROM public.daily_stock_prices
  WHERE security_id = p_security_id
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_price;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "trading_fees" numeric, "taxes" numeric, "interest" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH month_series AS (
        SELECT date_trunc('month', dd)::date AS month
        FROM generate_series(p_start_date, p_end_date, '1 month'::interval) dd
    ),
    -- 1. Fees and Taxes from expense transactions
    trading_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%fee%'), 0) AS total_fees,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%tax%'), 0) AS total_taxes
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'expense'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    ),
    -- 2. Loan Interest from debt_payment transactions
    loan_interest_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount), 0) AS total_interest
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'debt_payment'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    ),
    -- 3. Margin and Cash Advance Interest from expense transactions
    other_interest_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Margin%'), 0) AS total_margin_interest,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Cash advance%'), 0) AS total_cash_advance_interest
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'expense'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    )
    -- Final aggregation
    SELECT
        to_char(ms.month, 'YYYY-MM') AS month,
        COALESCE(tc.total_fees, 0) AS trading_fees,
        COALESCE(tc.total_taxes, 0) AS taxes,
        (COALESCE(lic.total_interest, 0) + COALESCE(oic.total_margin_interest, 0) + COALESCE(oic.total_cash_advance_interest, 0)) AS interest
    FROM month_series ms
    LEFT JOIN trading_costs tc ON ms.month = tc.month
    LEFT JOIN loan_interest_costs lic ON ms.month = lic.month
    LEFT JOIN other_interest_costs oic ON ms.month = oic.month
    ORDER BY ms.month;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "pnl" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_pnl NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(date_trunc('month', p_start_date)::date, p_end_date, '1 month'::interval) dd
    LOOP
        -- For the last month in the series, use the p_end_date
        IF date_trunc('month', v_month_start) = date_trunc('month', p_end_date) THEN
            v_month_end := p_end_date;
        ELSE
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
        END IF;
        -- Calculate PnL for the month using the existing function
        SELECT public.calculate_pnl(p_user_id, v_month_start, v_month_end) INTO v_pnl;
        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        pnl := v_pnl;
        RETURN NEXT;
    END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "twr" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_twr NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(date_trunc('month', p_start_date)::date, p_end_date, '1 month'::interval) dd
    LOOP
        -- For the last month in the series, use the p_end_date
        IF date_trunc('month', v_month_start) = date_trunc('month', p_end_date) THEN
            v_month_end := p_end_date;
        ELSE
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
        END IF;
        -- Calculate TWR for the month
        SELECT public.calculate_twr(p_user_id, v_month_start, v_month_end) INTO v_twr;
        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        twr := v_twr;
        RETURN NEXT;
    END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.ticker,
        s.name,
        s.logo_url AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        public.get_latest_stock_price(s.id) AS latest_price
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'stock' AND a.user_id = p_user_id
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" "uuid", "transaction_date" "date", "type" "text", "description" "text", "ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "amount" numeric, "currency_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_offset integer;
BEGIN
    -- Calculate the offset for pagination
    v_offset := (page_number - 1) * page_size;
    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.type::text,
        t.description,
        s.ticker,
        s.name,
        CASE
            WHEN s.logo_url IS NOT NULL THEN s.logo_url
            ELSE NULL
        END,
        tl.quantity,
        tl.amount,
        tl.currency_code::text
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    JOIN
        public.securities s ON a.security_id = s.id
    WHERE
        t.user_id = p_user_id AND
        s.asset_class NOT IN ('equity', 'liability') AND
        NOT (s.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell')) AND
        (start_date IS NULL OR t.transaction_date >= start_date) AND
        (end_date IS NULL OR t.transaction_date <= end_date) AND
        (asset_class_filter IS NULL OR s.asset_class::text = asset_class_filter)
    ORDER BY
        t.created_at DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_debts_asset_id uuid;
  v_transaction_id uuid;
  v_debt_id uuid;
BEGIN
  -- 1. Get debts asset
  SELECT a.id INTO v_debts_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'DEBTS' AND a.user_id = p_user_id;
  
  -- 4. Create the debt record
  INSERT INTO public.debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
  VALUES (
    p_user_id,
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    p_transaction_date,
    'active'
  ) RETURNING id INTO v_debt_id;
  -- 5. Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'borrow',
    p_description,
    v_debt_id,
    p_created_at
  ) RETURNING id INTO v_transaction_id;
  -- 6. Create the transaction legs
  -- Debit the deposit account (increase cash)
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_deposit_account_id,
    p_cash_asset_id,
    p_principal_amount,
    p_principal_amount,
    'VND'
  );
  -- Credit the Debts Principal account (increase liability)
  INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id),
    v_debts_asset_id,
    p_principal_amount * -1,
    p_principal_amount * -1,
    'VND'
  );
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_record jsonb;
    v_transaction_type text;
    v_asset_id uuid;
    v_cash_asset_id uuid;
    v_account_id uuid;
    v_debt_id uuid;
    v_asset_ticker text;
    v_cash_asset_ticker text;
    v_account_name text;
    v_lender_name text;
    v_security_id uuid;
BEGIN
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN RAISE EXCEPTION 'Input must be a JSON array of transactions.'; END IF;
    -- Temporarily disable all user-defined triggers on the transactions table
    ALTER TABLE public.transactions DISABLE TRIGGER USER;
    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_account_name := v_transaction_record->>'account';
        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_asset_ticker; END IF;
            SELECT id INTO v_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_asset_ticker; END IF;
        END IF;
        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_cash_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_cash_asset_ticker; END IF;
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_cash_asset_ticker; END IF;
        END IF;
        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account with name % not found.', v_account_name; END IF;
        END IF;
        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, v_asset_id, v_cash_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'debt_payment' THEN
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
                PERFORM "public"."handle_debt_payment_transaction"(p_user_id, v_debt_id, (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_cash_asset_id, 'income', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'dividend' THEN
                IF v_asset_ticker = 'EPF' THEN
                    PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, 'dividend', (v_transaction_record->>'created_at')::timestamptz);
                ELSE
                    PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_cash_asset_id, 'dividend', (v_transaction_record->>'created_at')::timestamptz);
                END IF;
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(p_user_id, v_transaction_record->>'counterparty', (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest_rate')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'date')::date, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;
    -- Re-enable all user-defined triggers on the transactions table
    ALTER TABLE public.transactions ENABLE TRIGGER USER;
    -- Generate the performance snapshots in a single batch
    PERFORM public.generate_performance_snapshots(p_user_id, p_start_date, CURRENT_DATE);
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_total_proceeds_native_currency numeric;
  v_cash_asset_currency_code text;
  v_purchased_asset_currency_code text;
  v_exchange_rate numeric;
  v_cost_basis_purchased_asset_vnd numeric;
  -- FX Gain/Loss variables
  v_cost_basis_cash_spent_vnd numeric := 0;
  v_realized_gain_loss_vnd numeric;
  v_remaining_quantity_to_spend numeric;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot numeric;
  v_cash_asset_leg_id uuid;
  v_owner_capital_asset_id uuid;
BEGIN
  -- 1. Get assets information
  -- Get currency codes for purchased asset and cash asset
  SELECT
    (SELECT s.currency_code FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id),
    (SELECT s.currency_code FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id)
  INTO v_purchased_asset_currency_code, v_cash_asset_currency_code;
  -- Get Owner Capital asset
  SELECT a.id INTO v_owner_capital_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  -- 2. Calculate the total proceeds in the native currency
  v_total_proceeds_native_currency := p_quantity * p_price;
  -- 3. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, price, created_at) VALUES (p_user_id, p_transaction_date, 'buy', p_description, p_price, p_created_at) RETURNING id INTO v_transaction_id;
  -- 3. Handle FX Gain/Loss if cash asset is not in VND
  IF v_cash_asset_currency_code != 'VND' THEN
    -- Get exchange rate to VND
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
    END IF;
    v_cost_basis_purchased_asset_vnd := v_total_proceeds_native_currency * v_exchange_rate;
    -- Consume tax lots of the cash asset
    v_remaining_quantity_to_spend := v_total_proceeds_native_currency;
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
    FOR v_lot IN
      SELECT * FROM public.tax_lots
      WHERE user_id = p_user_id
        AND asset_id = p_cash_asset_id
        AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_spend <= 0 THEN EXIT; END IF;
      v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
      UPDATE public.tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
      INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
      v_cost_basis_cash_spent_vnd := v_cost_basis_cash_spent_vnd + v_cost_basis_from_lot;
      v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_spend > 0 THEN
      RAISE EXCEPTION 'Not enough cash for purchase. Tried to spend %, but only % was available.', v_total_proceeds_native_currency, (v_total_proceeds_native_currency - v_remaining_quantity_to_spend);
    END IF;
    -- Calculate realized gain/loss
    v_realized_gain_loss_vnd := v_cost_basis_purchased_asset_vnd - v_cost_basis_cash_spent_vnd;
    -- Create transaction legs
    -- Credit the cash asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_account_id,
      p_cash_asset_id,
      v_total_proceeds_native_currency * -1,
      v_cost_basis_cash_spent_vnd * -1,
      v_cash_asset_currency_code
    )
    RETURNING id INTO v_cash_asset_leg_id;
    
    -- Debit the purchased asset
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_account_id,
      p_asset_id,
      p_quantity,
      v_cost_basis_purchased_asset_vnd,
      v_purchased_asset_currency_code
    );
    -- Credit/Debit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss_vnd != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
        (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
        v_owner_capital_asset_id,
        v_realized_gain_loss_vnd * -1,
        v_realized_gain_loss_vnd * -1,
        'VND'
      );
    END IF;
    
    -- Create lot consumptions
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
      INSERT INTO public.lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
      VALUES (v_cash_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;
  -- Standard buy logic if cash asset is VND
  ELSE
    v_cost_basis_purchased_asset_vnd := v_total_proceeds_native_currency;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
      -- Credit cash asset
      (v_transaction_id, p_account_id, p_cash_asset_id, v_total_proceeds_native_currency * -1, v_cost_basis_purchased_asset_vnd * -1, v_cash_asset_currency_code),
      -- Debit purchased asset
      (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis_purchased_asset_vnd, v_purchased_asset_currency_code);
  END IF;
  -- 4. Create tax lot for the purchased asset
  INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
  VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis_purchased_asset_vnd);
  RETURN v_transaction_id;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_total_payment numeric;
  v_owner_capital_asset_id uuid;
  v_debts_asset_id uuid;
BEGIN
  -- 1. Look up user-specific asset IDs
  SELECT
    (SELECT a.id FROM public.assets a
    JOIN public.securities s ON s.id = a.security_id
    WHERE s.ticker = 'DEBTS' AND a.user_id = p_user_id),
    (SELECT a.id FROM public.assets a
    JOIN public.securities s ON s.id = a.security_id
    WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id)
  INTO v_debts_asset_id, v_owner_capital_asset_id;
  -- 2. Calculate the total payment amount
  v_total_payment := p_principal_payment + p_interest_payment;
  -- 3. Create a new transactions record
  INSERT INTO public.transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'debt_payment',
    p_description,
    p_debt_id,
    p_created_at)
  RETURNING id INTO v_transaction_id;
  -- 4. Create the transaction legs
  -- Credit: Decrease cash from the paying account
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_from_account_id,
    p_cash_asset_id,
    v_total_payment * -1,
    v_total_payment * -1, 
    'VND'
  );
  -- Debit: Decrease the "Debts Principal" for principal portion
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id),
    v_debts_asset_id,
    p_principal_payment,
    p_principal_payment,
    'VND'
  );
  -- Debit: Decrease Owner Capital for interest portion
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
    v_owner_capital_asset_id,
    p_interest_payment,
    p_interest_payment,
    'VND'
  );
  -- 5. Mark the debt as paid
  UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
    v_calculated_amount numeric;
    v_asset_currency_code text;
    v_asset_class text;
    v_capital_security_id UUID;
    v_exchange_rate numeric;
BEGIN
    -- Get asset details
    SELECT s.currency_code, s.asset_class
    INTO v_asset_currency_code, v_asset_class
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;
    -- Calculate the amount
    IF v_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        -- Correctly fetch the historical exchange rate
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find exchange rate for ' || v_asset_currency_code || ' on or before ' || p_transaction_date);
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get capital asset and equity account
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    IF v_capital_security_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' security.'); END IF;
    SELECT id INTO v_capital_asset_id FROM public.assets WHERE security_id = v_capital_security_id AND user_id = p_user_id;
    IF v_capital_asset_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset for user.'); END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.'); END IF;
    -- Create transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
    VALUES (p_user_id, p_transaction_date, 'deposit', p_description, p_created_at)
    RETURNING id INTO v_transaction_id;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit cash
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_calculated_amount, v_asset_currency_code),
        -- Credit paid-in equity
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, v_calculated_amount * -1, v_calculated_amount * -1, 'VND');
    -- Create tax lot for non-VND cash assets
    IF (v_asset_class = 'cash' or v_asset_class = 'epf') AND v_asset_currency_code != 'VND' THEN
        INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
    END IF;
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cash_asset_currency_code text;
  v_transaction_id UUID;
  v_owner_capital_asset_id uuid;
  v_calculated_amount numeric;
  v_exchange_rate numeric;
  -- FX Gain/Loss variables
  v_total_cost_basis numeric := 0;
  v_realized_gain_loss numeric;
  v_remaining_quantity_to_spend numeric;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot numeric;
  v_asset_leg_id uuid;
BEGIN
  -- 1. Get the currency of the cash asset being spent
  SELECT s.currency_code INTO v_cash_asset_currency_code
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  WHERE a.id = p_asset_id AND a.user_id = p_user_id;
  -- 2. Get Owner Capital asset
  SELECT a.id INTO v_owner_capital_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  -- 3. Calculate the amount in VND
  IF v_cash_asset_currency_code = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;
  -- 4. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (p_user_id, p_transaction_date, 'expense', p_description, p_created_at)
  RETURNING id INTO v_transaction_id;
  -- 5. FX Gain/Loss logic for non-VND cash expenses
  IF v_cash_asset_currency_code != 'VND' THEN
    v_remaining_quantity_to_spend := p_quantity;
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
    -- Consume tax lots
    FOR v_lot IN
      SELECT * FROM public.tax_lots
      WHERE user_id = p_user_id
        AND asset_id = p_asset_id
        AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_spend <= 0 THEN EXIT; END IF;
      v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
      UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
      INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
      v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
      v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_spend > 0 THEN
      RAISE EXCEPTION 'Not enough cash for expense. Tried to spend %, but only % was available.', p_quantity, (p_quantity - v_remaining_quantity_to_spend);
    END IF;
    
    v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
    -- Create transaction legs
    -- Credit the cash asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_total_cost_basis * -1, v_cash_asset_currency_code)
    RETURNING id INTO v_asset_leg_id;
    -- Credit/Debit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
        (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
        v_owner_capital_asset_id,
        v_realized_gain_loss * -1,
        v_realized_gain_loss * -1,
        'VND'
      );
    END IF;
    -- Create lot consumptions
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
      INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
      VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;
  -- 6. Standard expense logic for VND
  ELSE
    -- Credit: Decrease cash asset
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_account_id,
      p_asset_id,
      p_quantity * -1,
      v_calculated_amount * -1,
      v_cash_asset_currency_code
    );
  END IF;
  -- 7. Debit Owner Equity for the expense
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
    v_owner_capital_asset_id,
    v_calculated_amount,
    v_calculated_amount,
    'VND'
  );
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_owner_capital_asset_id uuid;
  v_transaction_id uuid;
  v_asset_currency_code text;
  v_calculated_amount numeric;
  v_exchange_rate numeric;
BEGIN
  -- Get debited asset details
  SELECT s.currency_code INTO v_asset_currency_code
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  WHERE a.id = p_asset_id AND a.user_id = p_user_id;
  -- Get Owner Capital asset
  SELECT a.id INTO v_owner_capital_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  -- Calculate the amount
  IF v_asset_currency_code = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_asset_currency_code AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency_code, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;
  -- Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description, p_created_at)
  RETURNING id INTO v_transaction_id;
  -- Create transaction legs: Debit cash, Credit Owner Capital
  INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES
    (v_transaction_id,
    p_account_id,
    p_asset_id,
    p_quantity,
    v_calculated_amount,
    v_asset_currency_code),
    (v_transaction_id,
    (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
    v_owner_capital_asset_id,
    v_calculated_amount * -1,
    v_calculated_amount * -1,
    'VND');
  -- Create tax lot for non-VND cash assets
  IF v_asset_currency_code != 'VND' THEN
    INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_new_exchange_rate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who have assets in the updated currency and trigger snapshot generation.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE s.currency_code = NEW.currency_code
  LOOP
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_new_stock_price"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who hold the stock and trigger snapshot generation for them.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    WHERE a.security_id = NEW.security_id
  LOOP
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_new_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_transaction_date DATE;
BEGIN
  -- Get the user_id and transaction_date from the parent transaction
  SELECT t.user_id, t.transaction_date 
  INTO v_user_id, v_transaction_date
  FROM public.transactions t
  WHERE t.id = NEW.transaction_id;
  -- Call the snapshot generation function for the user who made the transaction
  -- from the transaction date to the current date.
  PERFORM public.generate_performance_snapshots(v_user_id, v_transaction_date, CURRENT_DATE);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_net_proceeds_native_currency numeric;
  v_cash_asset_currency_code text;
  v_sold_asset_currency_code text;
  v_exchange_rate numeric;
  v_proceeds_in_vnd numeric;
  
  -- Sell asset cost basis variables
  v_total_cost_basis_vnd numeric := 0;
  v_realized_gain_loss_vnd numeric;
  v_remaining_quantity_to_sell numeric := p_quantity_to_sell;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot_vnd numeric;
  v_asset_leg_id uuid;
  
  -- Equity-related variables
  v_owner_capital_asset_id uuid;
BEGIN
  -- 1. Get assets information
  -- Get currency codes for sold asset and cash asset
  SELECT
    (SELECT s.currency_code FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id),
    (SELECT s.currency_code FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id)
  INTO v_sold_asset_currency_code, v_cash_asset_currency_code;
  -- Get Owner Capital asset
  SELECT a.id INTO v_owner_capital_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  -- 2. Calculate net proceeds and their value in VND
  v_net_proceeds_native_currency := p_quantity_to_sell * p_price;
  IF v_cash_asset_currency_code != 'VND' THEN
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
    END IF;
    v_proceeds_in_vnd := v_net_proceeds_native_currency * v_exchange_rate;
  ELSE
    v_proceeds_in_vnd := v_net_proceeds_native_currency;
  END IF;
  -- 3. Consume tax lots of the sold asset to find its total cost basis in VND
  DROP TABLE IF EXISTS temp_consumed_lots;
  CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
  FOR v_lot IN
    SELECT * FROM tax_lots
    WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
    ORDER BY creation_date ASC
  LOOP
    IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
    v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
    v_cost_basis_from_lot_vnd := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
    
    UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
    INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
    
    v_total_cost_basis_vnd := v_total_cost_basis_vnd + v_cost_basis_from_lot_vnd;
    v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
  END LOOP;
  IF v_remaining_quantity_to_sell > 0 THEN
    RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell);
  END IF;
  -- 4. Calculate realized gain/loss for the sold asset
  v_realized_gain_loss_vnd := v_proceeds_in_vnd - v_total_cost_basis_vnd;
  
  -- 6. Create the transaction
  INSERT INTO transactions (user_id, transaction_date, type, description, price, created_at)
  VALUES (p_user_id, p_transaction_date, 'sell', p_description, p_price, p_created_at)
  RETURNING id INTO v_transaction_id;
  -- 7. Create transaction legs (all amounts in VND)
  -- Debit the cash asset for the net proceeds
  INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_cash_account_id,
    p_cash_asset_id,
    v_net_proceeds_native_currency,
    v_proceeds_in_vnd,
    v_cash_asset_currency_code
  );
  -- Credit the sold asset at its cost basis
  INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_cash_account_id,
    p_asset_id,
    p_quantity_to_sell * -1,
    v_total_cost_basis_vnd * -1,
    v_sold_asset_currency_code
  ) RETURNING id INTO v_asset_leg_id;
  -- Credit/Debit Owner Capital with the realized gain/loss
  IF v_realized_gain_loss_vnd != 0 THEN
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
      v_owner_capital_asset_id,
      v_realized_gain_loss_vnd * -1,
      v_realized_gain_loss_vnd * -1,
      'VND'
    );
  END IF;
  -- 8. Create lot consumptions for the sold asset
  FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
    INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
    VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
  END LOOP;
  -- 9. Create a new tax lot for the received cash asset if it's not in VND
  IF v_cash_asset_currency_code != 'VND' THEN
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
      p_user_id,
      p_cash_asset_id,
      v_transaction_id,
      'purchase',
      p_transaction_date,
      v_net_proceeds_native_currency,
      v_net_proceeds_native_currency,
      v_proceeds_in_vnd
    );
  END IF;
  
  RETURN v_transaction_id;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id UUID;
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_asset_account_id UUID;
    v_asset_currency_code TEXT;
    v_capital_security_id UUID;
BEGIN
    SELECT id INTO v_equity_account_id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity' LIMIT 1;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id; END IF;
    SELECT id INTO v_capital_security_id FROM securities WHERE ticker = 'CAPITAL' LIMIT 1;
    IF v_capital_security_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' security not found'; END IF;
    SELECT id INTO v_capital_asset_id FROM assets WHERE user_id = p_user_id AND security_id = v_capital_security_id LIMIT 1;
    IF v_capital_asset_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id; END IF;
    SELECT tl.account_id, s.currency_code INTO v_asset_account_id, v_asset_currency_code
    FROM transaction_legs tl
    JOIN assets a ON a.id = tl.asset_id
    JOIN securities s ON a.security_id = s.id
    WHERE tl.asset_id = p_asset_id
    LIMIT 1;
    IF v_asset_account_id IS NULL THEN RAISE EXCEPTION 'Could not determine an account for asset %', p_asset_id; END IF;
    INSERT INTO transactions (user_id, transaction_date, type, description, created_at) VALUES (p_user_id, p_transaction_date, 'split', p_description, p_created_at) RETURNING id INTO v_transaction_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cash_asset_currency_code text;
  v_transaction_id UUID;
  v_owner_capital_asset_id uuid;
  v_calculated_amount numeric;
  v_exchange_rate numeric;
  -- FX Gain/Loss variables
  v_total_cost_basis numeric := 0;
  v_realized_gain_loss numeric;
  v_remaining_quantity_to_withdraw numeric;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot numeric;
  v_asset_leg_id uuid;
  v_response JSONB;
BEGIN
  -- Get assets information
  SELECT s.currency_code INTO v_cash_asset_currency_code
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  WHERE a.id = p_asset_id AND a.user_id = p_user_id;
  -- Get Owner Capital asset
  SELECT a.id INTO v_owner_capital_asset_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  
  -- Calculate the amount
  IF v_cash_asset_currency_code = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;
  -- Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (p_user_id, p_transaction_date, 'withdraw', p_description, p_created_at)
  RETURNING id INTO v_transaction_id;
  
  -- FX Gain/Loss logic for non-VND cash withdrawal
  IF v_cash_asset_currency_code != 'VND' THEN
    v_remaining_quantity_to_withdraw := p_quantity;
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;    
    -- Consume tax lots
    FOR v_lot IN
      SELECT * FROM tax_lots
      WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_withdraw <= 0 THEN EXIT; END IF;
      v_quantity_from_lot := LEAST(v_remaining_quantity_to_withdraw, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
      UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
      INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
      v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
      v_remaining_quantity_to_withdraw := v_remaining_quantity_to_withdraw - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_withdraw > 0 THEN
      RAISE EXCEPTION 'Not enough cash to withdraw. Tried to withdraw %, but only % was available.', p_quantity, (p_quantity - v_remaining_quantity_to_withdraw);
    END IF;
    v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
    -- Create balanced transaction legs
    -- Credit the cash asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_account_id,
      p_asset_id,
      p_quantity * -1,
      v_total_cost_basis * -1,
      v_cash_asset_currency_code
    ) RETURNING id INTO v_asset_leg_id;
    -- Debit Owner Capital for the full current value
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
      v_owner_capital_asset_id,
      v_calculated_amount,
      v_calculated_amount,
      'VND');
    -- Debit/Credit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
        (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
        v_owner_capital_asset_id,
        v_realized_gain_loss * -1,
        v_realized_gain_loss * -1,
        'VND'
      );
    END IF;
    -- Create lot consumptions
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
      INSERT INTO public.lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
      VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
    
  -- Standard withdrawal logic for VND
  ELSE
    -- Credit cash asset
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_account_id,
      p_asset_id,
      p_quantity * -1,
      v_calculated_amount * -1,
      v_cash_asset_currency_code
    );
    -- Debit Owner Capital
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id),
      v_owner_capital_asset_id,
      v_calculated_amount,
      v_calculated_amount,
      'VND'
    );
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."update_assets_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update all assets linked to the inserted transaction
  UPDATE public.assets a
  SET current_quantity = CASE
      WHEN s.ticker = 'INTERESTS' THEN COALESCE((
          SELECT SUM(
            d.principal_amount *
            (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)
          )
          FROM public.debts d
          WHERE d.user_id = a.user_id
            AND d.status = 'active'
      ), 0)
      ELSE COALESCE((
          SELECT SUM(quantity)
          FROM public.transaction_legs tl
          WHERE tl.asset_id = a.id
      ), 0)
  END
  FROM public.securities s
  WHERE a.security_id = s.id;
  RETURN NULL;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get the security_id from the securities table for crypto assets
  SELECT id INTO v_security_id FROM securities WHERE ticker = p_ticker AND asset_class = 'crypto';
  -- If the security exists, insert or update the price
  IF v_security_id IS NOT NULL THEN
    INSERT INTO daily_crypto_prices (security_id, price, date)
    VALUES (v_security_id, p_price, CURRENT_DATE)
    ON CONFLICT (security_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get the security_id from the securities table for stock assets
  SELECT id INTO v_security_id FROM securities WHERE ticker = p_ticker AND asset_class = 'stock';
  -- If the security exists, insert or update the price
  IF v_security_id IS NOT NULL THEN
    INSERT INTO daily_stock_prices (security_id, price, date)
    VALUES (v_security_id, p_price, CURRENT_DATE)
    ON CONFLICT (security_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$;
CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."account_type" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "security_id" "uuid",
    "current_quantity" numeric(20,8) DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."daily_crypto_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."daily_exchange_rates" (
    "currency_code" character varying(10) NOT NULL,
    "date" "date" NOT NULL,
    "rate" numeric(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."daily_market_indices" (
    "date" "date" NOT NULL,
    "symbol" "text" NOT NULL,
    "close" numeric
);
CREATE TABLE IF NOT EXISTS "public"."daily_performance_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "net_equity_value" numeric(16,4) NOT NULL,
    "net_cash_flow" numeric(16,4) NOT NULL,
    "equity_index" numeric(8,2)
);
CREATE TABLE IF NOT EXISTS "public"."daily_stock_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."live_securities_data" (
    "symbol" "text" NOT NULL,
    "price" numeric NOT NULL,
    "trade_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "asset" "public"."asset_class" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."lot_consumptions" (
    "sell_transaction_leg_id" "uuid" NOT NULL,
    "tax_lot_id" "uuid" NOT NULL,
    "quantity_consumed" numeric(20,8) NOT NULL,
    CONSTRAINT "lot_consumptions_quantity_consumed_check" CHECK ((("quantity_consumed")::numeric > (0)::numeric))
);
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_currency" character varying(10) NOT NULL,
    "display_name" "text"
);
CREATE TABLE IF NOT EXISTS "public"."securities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" character varying(10),
    "logo_url" "text"
);
CREATE TABLE IF NOT EXISTS "public"."tax_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "creation_transaction_id" "uuid" NOT NULL,
    "origin" "public"."tax_lot_origin" NOT NULL,
    "creation_date" "date" NOT NULL,
    "original_quantity" numeric(20,8) NOT NULL,
    "cost_basis" numeric(16,4) DEFAULT 0 NOT NULL,
    "remaining_quantity" numeric(20,8) NOT NULL,
    CONSTRAINT "tax_lots_cost_basis_check" CHECK ((("cost_basis")::numeric >= (0)::numeric)),
    CONSTRAINT "tax_lots_original_quantity_check" CHECK ((("original_quantity")::numeric > (0)::numeric)),
    CONSTRAINT "tax_lots_remaining_quantity_check" CHECK ((("remaining_quantity")::numeric >= (0)::numeric))
);
CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(20,8) NOT NULL,
    "amount" numeric(16,4) NOT NULL,
    "currency_code" character varying(10) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "description" "text",
    "related_debt_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "price" numeric(16,4)
);
RESET ALL;
--
-- Dumped schema changes for auth and storage
--
