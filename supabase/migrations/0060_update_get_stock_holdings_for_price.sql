

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


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


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."asset_class" AS ENUM (
    'cash',
    'stock',
    'crypto',
    'epf',
    'equity',
    'liability'
);


ALTER TYPE "public"."asset_class" OWNER TO "postgres";


CREATE TYPE "public"."currency_type" AS ENUM (
    'fiat',
    'crypto'
);


ALTER TYPE "public"."currency_type" OWNER TO "postgres";


CREATE TYPE "public"."debt_status" AS ENUM (
    'active',
    'paid_off'
);


ALTER TYPE "public"."debt_status" OWNER TO "postgres";


CREATE TYPE "public"."tax_lot_origin" AS ENUM (
    'purchase',
    'split'
);


ALTER TYPE "public"."tax_lot_origin" OWNER TO "postgres";


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


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_balance NUMERIC(16,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);

    RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_summary"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
declare
  result json;
  display_currency text;
  asset_totals_by_class jsonb;
  asset_totals_by_ticker jsonb;
  cash_total numeric;
  loans_payable numeric;
  margins_payable numeric;
  liability_total numeric;
  capital_total numeric;
  earnings_total numeric;
  equity_total numeric;
  assets_total numeric;
begin
  -- Get display currency from the authenticated user's profile
  select p.display_currency into display_currency from profiles p where p.id = auth.uid();
  if display_currency is null then
    display_currency := 'USD';
  end if;

  -- Calculate totals by asset class, filtered by the user's assets
  select jsonb_object_agg(asset_class, total)
  into asset_totals_by_class
  from (
    select a.asset_class, sum(tl.amount) as total
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where a.user_id = auth.uid() -- Ensure we only get assets for the current user
    group by a.asset_class
  ) as class_totals;

  -- Calculate totals by ticker, filtered by the user's assets
  select jsonb_object_agg(ticker, total)
  into asset_totals_by_ticker
  from (
    select a.ticker, sum(tl.amount) as total
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where a.user_id = auth.uid() -- Ensure we only get assets for the current user
    group by a.ticker
  ) as ticker_totals;

  -- Set defaults to 0 if null
  asset_totals_by_class := coalesce(asset_totals_by_class, '{}'::jsonb);
  asset_totals_by_ticker := coalesce(asset_totals_by_ticker, '{}'::jsonb);

  -- Calculate asset values
  assets_total := (coalesce((asset_totals_by_class->>'cash')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'stock')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'epf')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'crypto')::numeric, 0));

  -- Calculate liability values
  cash_total := coalesce((asset_totals_by_class->>'cash')::numeric, 0);
  loans_payable := (coalesce((asset_totals_by_ticker->>'LOANS_PAYABLE')::numeric, 0)) * -1;
  margins_payable := case when cash_total < 0 then abs(cash_total) else 0 end;
  liability_total := loans_payable + margins_payable;

  -- Calculate equity values
  capital_total := (coalesce((asset_totals_by_ticker->>'CAPITAL')::numeric, 0)) * -1;
  earnings_total := (coalesce((asset_totals_by_ticker->>'EARNINGS')::numeric, 0)) * -1;
  equity_total := capital_total + earnings_total;

  -- Build the result JSON
  select json_build_object(
    'displayCurrency', display_currency,
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_totals_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_totals_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_totals_by_class->>'epf')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_totals_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', assets_total,
    'liabilities', json_build_array(
      json_build_object('type', 'Loans Payable', 'totalAmount', loans_payable),
      json_build_object('type', 'Margins Payable', 'totalAmount', margins_payable)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Paid-in Capital', 'totalAmount', capital_total),
      json_build_object('type', 'Retained Earnings', 'totalAmount', earnings_total)
    ),
    'totalEquity', equity_total
  ) into result;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_asset_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "last_updated_price" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.ticker,
        a.name,
        'https://s3-symbol-logo.tradingview.com/' || a.logo_url || '--big.svg' AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        a.last_updated_price
    FROM
        public.assets a
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        a.asset_class = 'stock' AND a.user_id = auth.uid()
    GROUP BY
        a.id, a.ticker, a.name, a.logo_url, a.last_updated_price
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."get_stock_holdings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_loans_payable_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
    v_liability_currency_code text;
BEGIN
    -- 1. Get or create the 'Loans Payable' asset
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM assets
    WHERE user_id = p_user_id AND name = 'Loans Payable' AND asset_class = 'liability'
    LIMIT 1;

    IF v_loans_payable_asset_id IS NULL THEN
        -- Assuming a default currency for the liability if it needs to be created.
        -- This could be parameterized if needed.
        SELECT display_currency INTO v_liability_currency_code FROM profiles WHERE id = p_user_id;
        INSERT INTO assets (user_id, name, ticker, asset_class, currency_code)
        VALUES (p_user_id, 'Loans Payable', 'LOANS_PAYABLE', 'liability', v_liability_currency_code)
        RETURNING id INTO v_loans_payable_asset_id;
    END IF;

    -- 2. Get the conceptual 'Liability' account
    SELECT id INTO v_loans_payable_account_id
    FROM accounts
    WHERE user_id = p_user_id AND name = 'Liability' AND type = 'conceptual'
    LIMIT 1;

    IF v_loans_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Liability conceptual account not found for user %', p_user_id;
    END IF;

    -- 3. Get the currency of the cash asset that will receive the funds
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Specified cash asset not found for account %', p_deposit_account_id;
    END IF;

    -- 4. Create the debt record
    INSERT INTO debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
    VALUES (p_user_id, p_lender_name, p_principal_amount, v_cash_asset_currency_code, p_interest_rate, p_transaction_date, 'active')
    RETURNING id INTO v_debt_id;

    -- 5. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'borrow', p_description, v_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 6. Create the transaction legs
    -- Debit the deposit account (increase cash)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_deposit_account_id, p_cash_asset_id, p_principal_amount, p_principal_amount, v_cash_asset_currency_code);

    -- Credit the Loans Payable liability account (increase liability)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, v_loans_payable_account_id, v_loans_payable_asset_id, p_principal_amount * -1, p_principal_amount * -1, v_liability_currency_code);

END;
$$;


ALTER FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_record jsonb; v_transaction_type text; v_asset_id uuid; v_cash_asset_id uuid; v_dividend_asset_id uuid; v_account_id uuid; v_debt_id uuid; v_asset_ticker text; v_cash_asset_ticker text; v_dividend_asset_ticker text; v_account_name text; v_lender_name text;
BEGIN
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN RAISE EXCEPTION 'Input must be a JSON array of transactions.'; END IF;
    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_dividend_asset_ticker := v_transaction_record->>'dividend_asset_ticker';
        v_account_name := v_transaction_record->>'account';

        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_asset_id FROM public.assets WHERE ticker = v_asset_ticker AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset with ticker % not found.', v_asset_ticker; END IF;
        END IF;
        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE ticker = v_cash_asset_ticker AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN RAISE EXCEPTION 'Cash asset with ticker % not found.', v_cash_asset_ticker; END IF;
        END IF;
        IF v_dividend_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_dividend_asset_id FROM public.assets WHERE ticker = v_dividend_asset_ticker AND user_id = p_user_id;
            IF v_dividend_asset_id IS NULL THEN RAISE EXCEPTION 'Dividend-paying asset with ticker % not found.', v_dividend_asset_ticker; END IF;
        END IF;
        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account with name % not found.', v_account_name; END IF;
        END IF;

        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, v_asset_id, v_cash_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'price')::numeric(10,2), (v_transaction_record->>'fees')::numeric(16,2), v_transaction_record->>'description');
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'quantity')::numeric * (v_transaction_record->>'price')::numeric, (v_transaction_record->>'fees')::numeric(16,2), (v_transaction_record->>'taxes')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'debt_payment' THEN
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
                PERFORM "public"."handle_debt_payment_transaction"(p_user_id, v_debt_id, (v_transaction_record->>'principal_payment')::numeric(16,2), (v_transaction_record->>'interest_payment')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id, 'income');
            WHEN 'dividend' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_cash_asset_id, 'dividend');
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(p_user_id, v_transaction_record->>'counterparty', (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'interest_rate')::numeric(4,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'date')::date, v_transaction_record->>'description');
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid; v_cost_basis numeric(16,2); v_cash_asset_currency_code text; v_purchased_asset_currency_code text;
BEGIN
    v_cost_basis := (p_quantity * p_price) + p_fees;
    SELECT currency_code INTO v_cash_asset_currency_code FROM assets WHERE id = p_cash_asset_id AND user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;
    SELECT currency_code INTO v_purchased_asset_currency_code FROM assets WHERE id = p_asset_id;
    INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'buy', p_description) RETURNING id INTO v_transaction_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_basis * -1, v_cost_basis * -1, v_cash_asset_currency_code),
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis, v_purchased_asset_currency_code);
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis);
    INSERT INTO transaction_details (transaction_id, price, fees, taxes) VALUES (v_transaction_id, p_price, p_fees, 0);
    RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid;
    v_loans_payable_asset_id uuid;
    v_total_payment numeric(16,2);
    v_cash_asset_currency_code text;
    v_liability_currency_code text;
    v_liability_balance numeric(16,2);
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_equity_account_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
BEGIN
    -- 1. Look up asset IDs
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM public.assets WHERE name = 'Loans Payable' AND user_id = p_user_id;

    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_loans_payable_asset_id IS NULL OR v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Core equity/liability assets not found for user %', p_user_id;
    END IF;

    -- 2. Get the currency of the cash asset being used for payment
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;

    -- 4. Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;

    -- 5. Determine amounts to draw from each equity component for the interest payment
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    
    IF v_earnings_balance < 0 THEN
        v_draw_from_earnings := LEAST(p_interest_payment, ABS(v_earnings_balance));
    ELSE
        v_draw_from_earnings := 0;
    END IF;
    
    v_draw_from_capital := p_interest_payment - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Interest payment exceeds available capital.';
        END IF;
    END IF;

    -- 6. Create a new transactions record
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'debt_payment', p_description, p_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 7. Create the transaction legs
    -- Credit: Decrease cash from the paying account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_from_account_id, p_cash_asset_id, v_total_payment * -1, v_total_payment * -1, v_cash_asset_currency_code);

    -- Debit: Decrease the "Loans Payable" liability for the principal portion
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id), v_loans_payable_asset_id, p_principal_payment, p_principal_payment, v_liability_currency_code);

    -- Debit: Decrease Retained Earnings for the interest portion
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital for the interest portion if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;

    -- 8. Check if the debt is now paid off by checking the balance of the liability legs
    SELECT COALESCE(SUM(tl.quantity), 0) INTO v_liability_balance
    FROM transaction_legs tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE t.related_debt_id = p_debt_id AND tl.asset_id = v_loans_payable_asset_id;

    -- If the balance is 0 or positive, the debt is considered paid off.
    IF v_liability_balance >= 0 THEN
        UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
    END IF;

END;
$$;


ALTER FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_capital_asset_id UUID; v_asset_currency_code VARCHAR(10); v_equity_account_id UUID; v_transaction_id UUID; v_response JSONB; v_leg_quantity numeric(16,2);
BEGIN
    v_leg_quantity := COALESCE(p_quantity, p_amount);
    SELECT id INTO v_capital_asset_id FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;
    IF v_capital_asset_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset.'); END IF;
    SELECT currency_code INTO v_asset_currency_code FROM public.assets WHERE id = p_asset_id AND user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN RETURN jsonb_build_object('error', 'Could not find the specified asset.'); END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.'); END IF;
    INSERT INTO public.transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'deposit', p_description) RETURNING id INTO v_transaction_id;
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, p_account_id, p_asset_id, v_leg_quantity, p_amount, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, v_leg_quantity * -1, p_amount * -1, v_asset_currency_code);
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
BEGIN
    -- 1. Fetch required equity asset records
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.';
    END IF;

    -- 2. Get the currency of the cash asset being spent
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset.';
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;

    -- 4. Determine amounts to draw from each equity component
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    
    IF v_earnings_balance < 0 THEN
        v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    ELSE
        v_draw_from_earnings := 0;
    END IF;

    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Expense amount exceeds available capital.';
        END IF;
    END IF;

    -- 5. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'expense', p_description)
    RETURNING id INTO v_transaction_id;

    -- 6. Create transaction legs
    -- Credit: Decrease cash from the source account
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code);

    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
END;
$$;


ALTER FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_description" "text", "p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
BEGIN
    -- Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, COALESCE(p_quantity, p_amount), p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;


ALTER FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_related_asset_id" "uuid", "p_transaction_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
BEGIN
    -- Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_asset_id)
    VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description, p_related_asset_id)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, COALESCE(p_quantity, p_amount), p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;


ALTER FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_related_asset_id" "uuid", "p_transaction_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_remaining_quantity_to_sell numeric(16,2) := p_quantity_to_sell;
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_cash_asset_currency_code text;
    v_sold_asset_currency_code text;
    v_retained_earnings_currency_code text;
    v_asset_leg_id uuid;
    v_consumed_lot record;
    v_additional_tax numeric(16,2) := 0;
    v_total_taxes numeric(16,2) := 0;
BEGIN
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code FROM assets WHERE user_id = p_user_id AND name = 'Retained Earnings' AND asset_class = 'equity' LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
    SELECT currency_code INTO v_cash_asset_currency_code FROM assets WHERE id = p_cash_asset_id AND user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;
    SELECT currency_code INTO v_sold_asset_currency_code FROM assets WHERE id = p_asset_id;
    FOR v_lot IN SELECT * FROM tax_lots WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0 ORDER BY creation_date ASC LOOP
        IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
        v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
        v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;

        IF v_lot.origin = 'split' THEN
            v_additional_tax := v_additional_tax + (v_quantity_from_lot * 500);
        END IF;

        UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
        INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
        v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
        v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_sell > 0 THEN RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell); END IF;

    v_total_taxes := p_taxes + v_additional_tax;

    INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'sell', p_description) RETURNING id INTO v_transaction_id;
    v_realized_gain_loss := p_total_proceeds - v_total_cost_basis - p_fees - v_total_taxes;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, p_cash_account_id, p_cash_asset_id, p_total_proceeds - p_fees - v_total_taxes, p_total_proceeds - p_fees - v_total_taxes, v_cash_asset_currency_code);
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, p_cash_account_id, p_asset_id, p_quantity_to_sell * -1, v_total_cost_basis * -1, v_sold_asset_currency_code) RETURNING id INTO v_asset_leg_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, (SELECT id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);
    FOR v_consumed_lot IN SELECT * FROM temp_consumed_lots LOOP INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed) VALUES (v_asset_leg_id, v_consumed_lot.lot_id, v_consumed_lot.quantity_consumed); END LOOP;
    INSERT INTO transaction_details (transaction_id, price, fees, taxes) VALUES (v_transaction_id, p_total_proceeds / p_quantity_to_sell, p_fees, v_total_taxes);
    RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id UUID; v_capital_asset_id UUID; v_equity_account_id UUID; v_asset_account_id UUID; v_asset_currency_code TEXT;
BEGIN
    SELECT id INTO v_equity_account_id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity' LIMIT 1;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id; END IF;
    SELECT id INTO v_capital_asset_id FROM assets WHERE user_id = p_user_id AND ticker = 'CAPITAL' LIMIT 1;
    IF v_capital_asset_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id; END IF;
    SELECT account_id, a.currency_code INTO v_asset_account_id, v_asset_currency_code FROM transaction_legs tl JOIN assets a ON a.id = tl.asset_id WHERE tl.asset_id = p_asset_id LIMIT 1;
    IF v_asset_account_id IS NULL THEN RAISE EXCEPTION 'Could not determine an account for asset %', p_asset_id; END IF;
    INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'split', p_description) RETURNING id INTO v_transaction_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);
END;
$$;


ALTER FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_earnings_asset RECORD; v_capital_asset RECORD; v_cash_asset_currency_code VARCHAR(10); v_equity_account_id UUID; v_transaction_id UUID; v_earnings_balance NUMERIC(16,2); v_draw_from_earnings NUMERIC(16,2); v_draw_from_capital NUMERIC(16,2); v_capital_balance NUMERIC(16,2); v_response JSONB; v_leg_quantity numeric(16,2);
BEGIN
    v_leg_quantity := COALESCE(p_quantity, p_amount);
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;
    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.'); END IF;
    SELECT currency_code INTO v_cash_asset_currency_code FROM public.assets WHERE id = p_asset_id AND user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RETURN jsonb_build_object('error', 'Could not find the specified cash asset.'); END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.'); END IF;
    
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    
    IF v_earnings_balance < 0 THEN
        v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    ELSE
        v_draw_from_earnings := 0;
    END IF;

    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.'); END IF;
    END IF;
    
    INSERT INTO public.transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'withdraw', COALESCE(p_description, 'Owner draw')) RETURNING id INTO v_transaction_id;
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, p_account_id, p_asset_id, v_leg_quantity * -1, p_amount * -1, v_cash_asset_currency_code);
    
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;
    
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
    
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."account_type" NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'Represents the different places where assets are held (e.g., brokerage, bank).';



CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" character varying(10) NOT NULL,
    "logo_url" "text",
    "last_updated_price" numeric(10,2)
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."assets" IS 'A master list of all investable assets (e.g., HPG stock, Bitcoin).';



CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."currencies" IS 'Stores all supported currencies, both fiat and crypto.';



CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lender_name" "text" NOT NULL,
    "principal_amount" numeric(16,2) NOT NULL,
    "currency_code" character varying(10) NOT NULL,
    "interest_rate" numeric(4,2) DEFAULT 0 NOT NULL,
    "start_date" "date" NOT NULL,
    "status" "public"."debt_status" NOT NULL
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


COMMENT ON TABLE "public"."debts" IS 'Tracks money borrowed to invest, keeping it separate from assets.';



CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "from_currency_code" character varying(10) NOT NULL,
    "to_currency_code" character varying(10) NOT NULL,
    "rate" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."exchange_rates" IS 'Stores historical exchange rates for currency conversions.';



CREATE SEQUENCE IF NOT EXISTS "public"."exchange_rates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exchange_rates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exchange_rates_id_seq" OWNED BY "public"."exchange_rates"."id";



CREATE TABLE IF NOT EXISTS "public"."lot_consumptions" (
    "sell_transaction_leg_id" "uuid" NOT NULL,
    "tax_lot_id" "uuid" NOT NULL,
    "quantity_consumed" integer NOT NULL,
    CONSTRAINT "lot_consumptions_quantity_consumed_check" CHECK ((("quantity_consumed")::numeric > (0)::numeric))
);


ALTER TABLE "public"."lot_consumptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."lot_consumptions" IS 'Creates an immutable link between a sale and the specific tax lots it consumed.';



COMMENT ON COLUMN "public"."lot_consumptions"."tax_lot_id" IS 'The tax lot that was consumed from.';



COMMENT ON COLUMN "public"."lot_consumptions"."quantity_consumed" IS 'The number of shares consumed from this lot in a specific sale.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_currency" character varying(10) NOT NULL,
    "display_name" "text",
    "last_stock_fetching" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores user-specific settings and is linked one-to-one with auth.users.';



COMMENT ON COLUMN "public"."profiles"."display_name" IS 'The user''s preferred display name in the application.';



CREATE TABLE IF NOT EXISTS "public"."tax_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "creation_transaction_id" "uuid" NOT NULL,
    "origin" "public"."tax_lot_origin" NOT NULL,
    "creation_date" "date" NOT NULL,
    "original_quantity" integer NOT NULL,
    "cost_basis" numeric(16,2) NOT NULL,
    "remaining_quantity" integer NOT NULL,
    CONSTRAINT "tax_lots_cost_basis_check" CHECK (("cost_basis" >= (0)::numeric)),
    CONSTRAINT "tax_lots_original_quantity_check" CHECK ((("original_quantity")::numeric > (0)::numeric)),
    CONSTRAINT "tax_lots_remaining_quantity_check" CHECK ((("remaining_quantity")::numeric >= (0)::numeric))
);


ALTER TABLE "public"."tax_lots" OWNER TO "postgres";


COMMENT ON TABLE "public"."tax_lots" IS 'Stores individual acquisition lots for assets to enable FIFO cost basis tracking.';



COMMENT ON COLUMN "public"."tax_lots"."origin" IS 'The type of transaction that created the lot (e.g., ''buy'', ''split''). Reuses the transaction_type enum.';



COMMENT ON COLUMN "public"."tax_lots"."remaining_quantity" IS 'The quantity of the asset remaining in this lot. Updated upon sale.';



CREATE TABLE IF NOT EXISTS "public"."transaction_details" (
    "transaction_id" "uuid" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "fees" numeric(16,2) DEFAULT 0 NOT NULL,
    "taxes" numeric(16,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."transaction_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."transaction_details" IS 'Stores specific data for buy/sell trades, like price, fees, and taxes.';



CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(16,2) NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "currency_code" character varying(10) NOT NULL
);


ALTER TABLE "public"."transaction_legs" OWNER TO "postgres";


COMMENT ON TABLE "public"."transaction_legs" IS 'The individual asset movements that compose a transaction.';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "description" "text",
    "related_debt_id" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."transactions" IS 'Represents a single financial event, like a trade or a deposit.';



ALTER TABLE ONLY "public"."exchange_rates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exchange_rates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_user_id_ticker_key" UNIQUE ("user_id", "ticker");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_date_from_currency_code_to_currency_code_key" UNIQUE ("date", "from_currency_code", "to_currency_code");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_pkey" PRIMARY KEY ("sell_transaction_leg_id", "tax_lot_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_details"
    ADD CONSTRAINT "transaction_details_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_from_currency_code_fkey" FOREIGN KEY ("from_currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_to_currency_code_fkey" FOREIGN KEY ("to_currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_sell_transaction_leg_id_fkey" FOREIGN KEY ("sell_transaction_leg_id") REFERENCES "public"."transaction_legs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_tax_lot_id_fkey" FOREIGN KEY ("tax_lot_id") REFERENCES "public"."tax_lots"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_display_currency_fkey" FOREIGN KEY ("display_currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_creation_transaction_id_fkey" FOREIGN KEY ("creation_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_details"
    ADD CONSTRAINT "transaction_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_related_debt_id_fkey" FOREIGN KEY ("related_debt_id") REFERENCES "public"."debts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can read currencies" ON "public"."currencies" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read exchange_rates" ON "public"."exchange_rates" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Users can manage details for their own transactions" ON "public"."transaction_details" USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_details"."transaction_id")))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_details"."transaction_id"))));



CREATE POLICY "Users can manage their own accounts" ON "public"."accounts" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own assets" ON "public"."assets" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own debts" ON "public"."debts" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own lot consumptions" ON "public"."lot_consumptions" USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "tax_lots"."user_id"
   FROM "public"."tax_lots"
  WHERE ("tax_lots"."id" = "lot_consumptions"."tax_lot_id")))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "tax_lots"."user_id"
   FROM "public"."tax_lots"
  WHERE ("tax_lots"."id" = "lot_consumptions"."tax_lot_id"))));



CREATE POLICY "Users can manage their own profile" ON "public"."profiles" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can manage their own tax lots" ON "public"."tax_lots" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own transaction_legs" ON "public"."transaction_legs" USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_legs"."transaction_id")))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_legs"."transaction_id"))));



CREATE POLICY "Users can manage their own transactions" ON "public"."transactions" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_consumptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_lots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_legs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_description" "text", "p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_description" "text", "p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_description" "text", "p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_related_asset_id" "uuid", "p_transaction_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_related_asset_id" "uuid", "p_transaction_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_related_asset_id" "uuid", "p_transaction_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."lot_consumptions" TO "anon";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tax_lots" TO "anon";
GRANT ALL ON TABLE "public"."tax_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_lots" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_details" TO "anon";
GRANT ALL ON TABLE "public"."transaction_details" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_details" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_legs" TO "anon";
GRANT ALL ON TABLE "public"."transaction_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_legs" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";









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






























RESET ALL;

--
-- Dumped schema changes for auth and storage
--

