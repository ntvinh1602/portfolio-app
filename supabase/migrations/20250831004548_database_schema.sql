

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


CREATE OR REPLACE FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_debts_asset_id uuid;
  v_transaction_id uuid;
  v_debt_id uuid;
BEGIN
  -- 1. Get debts asset
  v_debts_asset_id := public.get_asset_id_from_ticker(p_user_id, 'DEBTS');
  
  -- 2. Create the debt record
  INSERT INTO public.debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, is_active)
  VALUES (
    p_user_id,
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    p_transaction_date,
    true
  ) RETURNING id INTO v_debt_id;

  -- 3. Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'borrow',
    p_description,
    v_debt_id,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Create the transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES
    -- Debit the deposit account (increase cash)
    (v_transaction_id,
    p_cash_asset_id,
    p_principal_amount,
    p_principal_amount,
    'VND'),
    -- Credit the Debts Principal account (increase liability)
    (v_transaction_id,
    v_debts_asset_id,
    p_principal_amount * -1,
    p_principal_amount * -1,
    'VND');
END;
$$;


ALTER FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_total_proceeds_native_currency numeric;
  v_cash_asset_currency text;
  v_purchased_asset_currency text;
  v_exchange_rate numeric;
  v_cost_basis_purchased_asset numeric; -- in VND

  -- FX Gain/Loss variables
  v_cost_basis_cash_spent numeric := 0; -- in VND
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
  v_purchased_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  v_cash_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Calculate the total proceeds in the native currency
  v_total_proceeds_native_currency := p_quantity * p_price;

  -- 3. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, price, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'buy',
    p_description,
    p_price,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Handle FX Gain/Loss if cash asset is not in VND
  IF v_cash_asset_currency != 'VND' THEN
    -- Get exchange rate to VND
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency, p_transaction_date;
    END IF;
    v_cost_basis_purchased_asset := v_total_proceeds_native_currency * v_exchange_rate;
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
      v_cost_basis_cash_spent := v_cost_basis_cash_spent + v_cost_basis_from_lot;
      v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_spend > 0 THEN
      RAISE EXCEPTION 'Not enough cash for purchase. Tried to spend %, but only % was available.', v_total_proceeds_native_currency, (v_total_proceeds_native_currency - v_remaining_quantity_to_spend);
    END IF;
    -- Calculate realized gain/loss
    v_realized_gain_loss_vnd := v_cost_basis_purchased_asset - v_cost_basis_cash_spent;
    -- Create transaction legs
    -- Credit the cash asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_cash_asset_id,
      v_total_proceeds_native_currency * -1,
      v_cost_basis_cash_spent * -1,
      v_cash_asset_currency
    )
    RETURNING id INTO v_cash_asset_leg_id;
    -- Debit the purchased asset
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity,
      v_cost_basis_purchased_asset,
      v_purchased_asset_currency
    );
    -- Credit/Debit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss_vnd != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
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
    v_cost_basis_purchased_asset := v_total_proceeds_native_currency;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES
      -- Credit cash asset
      (v_transaction_id,
      p_cash_asset_id,
      v_total_proceeds_native_currency * -1,
      v_cost_basis_purchased_asset * -1,
      v_cash_asset_currency),
      -- Debit purchased asset
      (v_transaction_id,
      p_asset_id,
      p_quantity,
      v_cost_basis_purchased_asset,
      v_purchased_asset_currency);
  END IF;
  
  -- 5. Create tax lot for the purchased asset
  INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
  VALUES (
    p_user_id,
    p_asset_id,
    v_transaction_id,
    p_transaction_date,
    p_quantity,
    p_quantity,
    v_cost_basis_purchased_asset
  );
  RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."add_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_debts_asset_id := public.get_asset_id_from_ticker(p_user_id, 'DEBTS');
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

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
    p_created_at
  ) RETURNING id INTO v_transaction_id;

INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
VALUES
  -- Credit: Decrease cash from the paying account
  (v_transaction_id,
  p_cash_asset_id,
  v_total_payment * -1,
  v_total_payment * -1,
  'VND'),
  -- Debit: Decrease the "Debts Principal" for principal portion
  (v_transaction_id,
  v_debts_asset_id,
  p_principal_payment,
  p_principal_payment,
  'VND'),
  -- Debit: Decrease Owner Capital for interest portion
  (v_transaction_id,
  v_owner_capital_asset_id,
  p_interest_payment,
  p_interest_payment,
  'VND');

  -- 5. Mark the debt as paid
  UPDATE public.debts SET is_active = false WHERE id = p_debt_id;
END;
$$;


ALTER FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_owner_capital_asset_id UUID;
  v_transaction_id UUID;
  v_response JSONB;
  v_calculated_amount numeric;
  v_asset_currency text;
  v_exchange_rate numeric;
BEGIN
  -- 1. Get asset details
  -- Get asset currency
  v_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');
  
  -- 2. Calculate the amount
  IF v_asset_currency = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    -- Correctly fetch the historical exchange rate
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;

  -- 3. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'deposit',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Create transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES
    -- Debit cash
    (v_transaction_id,
    p_asset_id,
    p_quantity,
    v_calculated_amount,
    v_asset_currency),
    -- Credit paid-in equity
    (v_transaction_id,
    v_owner_capital_asset_id,
    v_calculated_amount * -1,
    v_calculated_amount * -1,
    'VND');

  -- 5. Create tax lot for non-VND cash assets
  IF v_asset_currency != 'VND' THEN
    INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
      p_user_id,
      p_asset_id,
      v_transaction_id,
      p_transaction_date,
      p_quantity,
      p_quantity,
      v_calculated_amount
    );
  END IF;
  v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
  RETURN v_response;
  EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


ALTER FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cash_asset_currency text;
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
  v_cash_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);

  -- 2. Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 3. Calculate the amount in VND
  IF v_cash_asset_currency = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;

  -- 4. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'expense',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 5. FX Gain/Loss logic for non-VND cash expenses
  IF v_cash_asset_currency != 'VND' THEN
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
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_total_cost_basis * -1,
      v_cash_asset_currency
    ) RETURNING id INTO v_asset_leg_id;
    -- Credit/Debit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
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
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_calculated_amount * -1,
      v_cash_asset_currency
    );
  END IF;

  -- 7. Debit Owner Equity for the expense
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    v_owner_capital_asset_id,
    v_calculated_amount,
    v_calculated_amount,
    'VND'
  );
END;
$$;


ALTER FUNCTION "public"."add_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_owner_capital_asset_id uuid;
  v_transaction_id uuid;
  v_asset_currency text;
  v_calculated_amount numeric;
  v_exchange_rate numeric;
BEGIN
  -- 1. Get asset information
  -- Get debited asset details
  v_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Calculate the amount
  IF v_asset_currency = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;

  -- 3. Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    p_transaction_type::transaction_type,
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Create transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES
    -- Debit cash
    (v_transaction_id,
    p_asset_id,
    p_quantity,
    v_calculated_amount,
    v_asset_currency),
    -- Credit Owner Capital
    (v_transaction_id,
    v_owner_capital_asset_id,
    v_calculated_amount * -1,
    v_calculated_amount * -1,
    'VND');

  -- 5. Create tax lot for non-VND cash assets
  IF v_asset_currency != 'VND' THEN
    INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
      p_user_id,
      p_asset_id,
      v_transaction_id,
      p_transaction_date,
      p_quantity,
      p_quantity,
      v_calculated_amount
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."add_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_net_proceeds_native_currency numeric;
  v_cash_asset_currency text;
  v_sold_asset_currency text;
  v_exchange_rate numeric;
  v_proceeds_in_vnd numeric;
  
  -- Sell asset cost basis variables
  v_total_cost_basis numeric := 0;
  v_realized_pnl numeric; -- in VND
  v_remaining_quantity_to_sell numeric := p_quantity_to_sell;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot numeric; -- in VND
  v_asset_leg_id uuid;
  
  -- Equity-related variables
  v_owner_capital_asset_id uuid;
BEGIN
  -- 1. Get assets information
  -- Get currency codes for sold asset and cash asset
  v_sold_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  v_cash_asset_currency := public.get_asset_currency(p_user_id, p_cash_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Calculate net proceeds and their value in VND
  v_net_proceeds_native_currency := p_quantity_to_sell * p_price;
  IF v_cash_asset_currency != 'VND' THEN
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency, p_transaction_date;
    END IF;
    v_proceeds_in_vnd := v_net_proceeds_native_currency * v_exchange_rate;
  ELSE
    v_proceeds_in_vnd := v_net_proceeds_native_currency;
  END IF;

  -- 3. Consume tax lots of the sold asset to find its total cost basis in VND
  DROP TABLE IF EXISTS temp_consumed_lots;
  CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
  FOR v_lot IN
    SELECT * FROM public.tax_lots
    WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
    ORDER BY creation_date ASC
  LOOP
    IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
    v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
    v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
    
    UPDATE public.tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
    INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
    
    v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
    v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
  END LOOP;
  IF v_remaining_quantity_to_sell > 0 THEN
    RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell);
  END IF;

  -- 4. Calculate realized gain/loss for the sold asset
  v_realized_pnl := v_proceeds_in_vnd - v_total_cost_basis;
  
  -- 5. Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, price, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'sell',
    p_description,
    p_price,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 6. Create transaction legs (all amounts in VND)
  -- Debit the cash asset for the net proceeds
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_cash_asset_id,
    v_net_proceeds_native_currency,
    v_proceeds_in_vnd,
    v_cash_asset_currency
  );
  -- Credit the sold asset at its cost basis
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    p_asset_id,
    p_quantity_to_sell * -1,
    v_total_cost_basis * -1,
    v_sold_asset_currency
  ) RETURNING id INTO v_asset_leg_id;
  -- Credit/Debit Owner Capital with the realized gain/loss
  IF v_realized_pnl != 0 THEN
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      v_owner_capital_asset_id,
      v_realized_pnl * -1,
      v_realized_pnl * -1,
      'VND'
    );
  END IF;

  -- 7. Create lot consumptions for the sold asset
  FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
    INSERT INTO public.lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
    VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
  END LOOP;

  -- 8. Create a new tax lot for the received cash asset if it's not in VND
  IF v_cash_asset_currency != 'VND' THEN
    INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
      p_user_id,
      p_cash_asset_id,
      v_transaction_id,
      p_transaction_date,
      v_net_proceeds_native_currency,
      v_net_proceeds_native_currency,
      v_proceeds_in_vnd
    );
  END IF;
  RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."add_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id UUID;
  v_owner_capital_asset_id UUID;
  v_asset_currency TEXT;
BEGIN
  -- 1. Get assets information
  -- Get currency code for asset
  v_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at) VALUES (
    p_user_id,
    p_transaction_date,
    'split',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 3. Create transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code) VALUES
    -- Debit asset
    (v_transaction_id,
    p_asset_id,
    p_quantity,
    0,
    v_asset_currency),
    -- Credit owner capital
    (v_transaction_id,
    v_owner_capital_asset_id,
    0,
    0,
    'VND');

  -- 4. Create tax lots
  INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (
    p_user_id,
    p_asset_id,
    v_transaction_id,
    p_transaction_date,
    p_quantity,
    p_quantity,
    0
  );
END;
$$;


ALTER FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cash_asset_currency text;
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
  -- 1. Get assets information
  -- Get cash asset currency
  v_cash_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');
  
  -- 22. Calculate the amount
  IF v_cash_asset_currency = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_cash_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;

  -- 3. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'withdraw',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;
  
  -- 4. FX Gain/Loss logic for non-VND cash withdrawal
  IF v_cash_asset_currency != 'VND' THEN
    v_remaining_quantity_to_withdraw := p_quantity;
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;    
    -- Consume tax lots
    FOR v_lot IN
      SELECT * FROM public.tax_lots
      WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_withdraw <= 0 THEN EXIT; END IF;
      v_quantity_from_lot := LEAST(v_remaining_quantity_to_withdraw, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
      UPDATE public.tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
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
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_total_cost_basis * -1,
      v_cash_asset_currency
    ) RETURNING id INTO v_asset_leg_id;
    -- Debit Owner Capital for the full current value
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      v_owner_capital_asset_id,
      v_calculated_amount,
      v_calculated_amount,
      'VND'
    );
    -- Debit/Credit Owner Capital with the realized FX gain/loss
    IF v_realized_gain_loss != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_transaction_id,
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
    
  -- 5. Standard withdrawal logic for VND
  ELSE
    -- Credit cash asset
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_calculated_amount * -1,
      v_cash_asset_currency
    );
    -- Debit Owner Capital
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
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


ALTER FUNCTION "public"."add_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


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


ALTER FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


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


ALTER FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'extensions'
    AS $$
DECLARE
  token text;
BEGIN
  -- Retrieve the secret directly from vault.decrypted_secrets
  SELECT decrypted_secret
  INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'vercel_revalidate_token';

  -- Call Vercel revalidate API
  PERFORM net.http_post(
    'https://portapp-vinh.vercel.app/api/revalidate',
    jsonb_build_object('x-secret-token', token)
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."call_vercel_revalidate"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

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
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_debts"("p_user_id" "uuid") RETURNS SETOF "public"."debts"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT * FROM public.debts WHERE is_active AND user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_active_debts"("p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_currency"("p_user_id" "uuid", "p_asset_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_currency text;
BEGIN
  SELECT s.currency_code INTO v_currency
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE a.id = p_asset_id AND a.user_id = p_user_id;

  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'Currency code not found for asset % and user %.', p_asset_id, p_user_id;
  END IF;

  RETURN v_currency;
END;
$$;


ALTER FUNCTION "public"."get_asset_currency"("p_user_id" "uuid", "p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_data"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  assets_data jsonb;
BEGIN
  -- Fetch assets data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'user_id', a.user_id,
      'security_id', a.security_id,
      'securities', to_jsonb(s)
    )
  ) INTO assets_data
  FROM assets a
  JOIN securities s ON a.security_id = s.id
  WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability');
  RETURN jsonb_build_object('assets', assets_data);
END;
$$;


ALTER FUNCTION "public"."get_asset_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_id_from_ticker"("p_user_id" "uuid", "p_ticker" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT a.id INTO v_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = p_ticker AND a.user_id = p_user_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Asset for ticker % not found for user.', p_ticker;
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."get_asset_id_from_ticker"("p_user_id" "uuid", "p_ticker" "text") OWNER TO "postgres";


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
  WHERE d.user_id = p_user_id AND d.is_active;
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


ALTER FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots
        WHERE user_id = p_user_id;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT
      label,
      s.date::date AS snapshot_date,
      s.portfolio_value,
      s.vni_value
    FROM public.sampling_benchmark_data(p_user_id, start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT
      s.id AS security_id,
      public.get_latest_crypto_price(s.id) AS latest_price,
      public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM public.securities s
    WHERE s.asset_class = 'crypto'
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url AS logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.latest_price,
    ld.latest_usd_rate,
    SUM(tl.quantity) * ld.latest_price * ld.latest_usd_rate AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.security_id = s.id
  WHERE s.asset_class = 'crypto' AND a.user_id = p_user_id
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, ld.latest_price, ld.latest_usd_rate
  HAVING SUM(tl.quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "net_equity_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots
        WHERE user_id = p_user_id;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT
      label,
      s.date AS snapshot_date,
      s.net_equity_value
    FROM public.sampling_equity_data(p_user_id, start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_threshold" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_prices AS (
    SELECT 
      s.id AS security_id, 
      public.get_latest_stock_price(s.id) AS latest_price
    FROM public.securities s
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    lp.latest_price,
    SUM(tl.quantity) * lp.latest_price AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_prices lp ON lp.security_id = s.id
  WHERE s.asset_class = 'stock' AND a.user_id = p_user_id
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, lp.latest_price
  HAVING SUM(tl.quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date", "end_date" "date", "asset_class_filter" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_exchange_rate"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_stock_price"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_record jsonb;
  v_transaction_type text;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_debt_id uuid;
  v_asset_ticker text;
  v_cash_asset_ticker text;
  v_lender_name text;
  v_security_id uuid;
BEGIN
  IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of transactions.';
  END IF;

  -- Temporarily disable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions DISABLE TRIGGER USER;

  FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
  LOOP
    v_transaction_type := v_transaction_record->>'type';

    v_asset_ticker := v_transaction_record->>'asset_ticker';
    IF v_asset_ticker IS NOT NULL THEN
      v_asset_id := public.get_asset_id_from_ticker(p_user_id, v_asset_ticker);
    END IF;

    v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
    IF v_cash_asset_ticker IS NOT NULL THEN
      v_cash_asset_id := public.get_asset_id_from_ticker(p_user_id, v_cash_asset_ticker);
    END IF;

    CASE v_transaction_type
      WHEN 'buy' THEN PERFORM "public"."add_buy_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        v_asset_id,
        v_cash_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'sell' THEN PERFORM "public"."add_sell_transaction"(
        p_user_id,
        v_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'deposit' THEN PERFORM "public"."add_deposit_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'withdraw' THEN PERFORM "public"."add_withdraw_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'debt_payment' THEN
        v_lender_name := v_transaction_record->>'counterparty';
        SELECT id INTO v_debt_id
        FROM public.debts
        WHERE lender_name = v_lender_name
          AND user_id = p_user_id
          AND is_active;
        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
        END IF;
        PERFORM "public"."add_debt_payment_transaction"(
          p_user_id,
          v_debt_id,
          (v_transaction_record->>'principal')::numeric,
          (v_transaction_record->>'interest')::numeric,
          (v_transaction_record->>'date')::date,
          v_cash_asset_id,
          v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'income' THEN
        PERFORM "public"."add_income_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          (v_transaction_record->>'quantity')::numeric,
          v_transaction_record->>'description',
          v_cash_asset_id,
          'income',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'dividend' THEN
        IF v_asset_ticker = 'EPF' THEN
          PERFORM "public"."add_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        ELSE
          PERFORM "public"."add_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_cash_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        END IF;
      WHEN 'expense' THEN PERFORM "public"."add_expense_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'borrow' THEN PERFORM "public"."add_borrow_transaction"(
        p_user_id,
        v_transaction_record->>'counterparty',
        (v_transaction_record->>'principal')::numeric,
        (v_transaction_record->>'interest_rate')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'split' THEN PERFORM "public"."add_split_transaction"(
        p_user_id,
        v_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'date')::date,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
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


ALTER FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_dnse_orders"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  unprocessed_order RECORD;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_user_id uuid;
BEGIN
  -- Since we don't have a user_id in dnse_orders, we'll need to get it from the profiles table.
  -- This assumes there is only one user. If there are multiple users, this logic will need to be adjusted.
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;

  -- Get the VND cash asset ID for the user. This is used for all transactions.
  v_cash_asset_id := public.get_asset_id_from_ticker(v_user_id, 'VND');

  FOR unprocessed_order IN
    SELECT * FROM public.dnse_orders WHERE txn_created = false
  LOOP
    -- Get the asset_id for the security being traded
    v_asset_id := public.get_asset_id_from_ticker(v_user_id, unprocessed_order.symbol);

    -- Create a buy or sell transaction
    IF unprocessed_order.side = 'NB' THEN
      PERFORM public.add_buy_transaction(
        v_user_id,
        unprocessed_order.modified_date::date,
        v_asset_id,
        v_cash_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        'Buy ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      );
    ELSIF unprocessed_order.side = 'NS' THEN
      PERFORM public.add_sell_transaction(
        v_user_id,
        v_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        unprocessed_order.modified_date::date,
        v_cash_asset_id,
        'Sell ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      );
    END IF;

    -- Create an expense transaction for the tax, if applicable
    IF unprocessed_order.tax > 0 THEN
      PERFORM public.add_expense_transaction(
        v_user_id,
        unprocessed_order.modified_date::date,
        unprocessed_order.tax,
        'Income tax',
        v_cash_asset_id,
        unprocessed_order.modified_date
      );
    END IF;

    -- Create an expense transaction for the fee, if applicable
    IF unprocessed_order.fee > 0 THEN
      PERFORM public.add_expense_transaction(
        v_user_id,
        unprocessed_order.modified_date::date,
        unprocessed_order.fee,
        'Transaction fee',
        v_cash_asset_id,
        unprocessed_order.modified_date
      );
    END IF;

    -- Mark the order as processed
    UPDATE public.dnse_orders
    SET txn_created = true
    WHERE id = unprocessed_order.id;

  END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_dnse_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sampling_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "portfolio_value" numeric, "vni_value" numeric)
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
    RETURN QUERY SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd;
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
    IF range_end > data_count THEN range_end := data_count;
    END IF;
    
    -- Ensure range_start is not greater than range_end
    IF range_start > range_end THEN CONTINUE;
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
  RETURN QUERY SELECT r.date, r.portfolio_value, r.vni_value FROM result_data_temp r ORDER BY r.date;
  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;


ALTER FUNCTION "public"."sampling_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric)
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
  FROM daily_performance_snapshots dps
  WHERE dps.user_id = p_user_id
    AND dps.date >= p_start_date
    AND dps.date <= p_end_date
  ORDER BY dps.date;
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


ALTER FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


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
          WHERE d.user_id = a.user_id AND d.is_active
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


ALTER FUNCTION "public"."update_assets_after_transaction"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) OWNER TO "postgres";


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


ALTER FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "security_id" "uuid",
    "current_quantity" numeric(20,8) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_crypto_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);


ALTER TABLE "public"."daily_crypto_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_exchange_rates" (
    "currency_code" character varying(10) NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."daily_performance_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "net_equity_value" numeric(16,4) NOT NULL,
    "net_cash_flow" numeric(16,4) NOT NULL,
    "equity_index" numeric(8,2)
);


ALTER TABLE "public"."daily_performance_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_stock_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);


ALTER TABLE "public"."daily_stock_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnse_orders" (
    "id" bigint NOT NULL,
    "side" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "order_type" "text",
    "order_status" "text",
    "fill_quantity" numeric,
    "average_price" numeric,
    "modified_date" timestamp with time zone DEFAULT "now"(),
    "tax" numeric(12,0),
    "fee" numeric,
    "txn_created" boolean DEFAULT false
);


ALTER TABLE "public"."dnse_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lot_consumptions" (
    "sell_transaction_leg_id" "uuid" NOT NULL,
    "tax_lot_id" "uuid" NOT NULL,
    "quantity_consumed" numeric(20,8) NOT NULL,
    CONSTRAINT "lot_consumptions_quantity_consumed_check" CHECK ((("quantity_consumed")::numeric > (0)::numeric))
);


ALTER TABLE "public"."lot_consumptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_currency" character varying(10) NOT NULL,
    "display_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."securities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" character varying(10),
    "logo_url" "text"
);


ALTER TABLE "public"."securities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "creation_transaction_id" "uuid" NOT NULL,
    "creation_date" "date" NOT NULL,
    "original_quantity" numeric(20,8) NOT NULL,
    "cost_basis" numeric(16,4) DEFAULT 0 NOT NULL,
    "remaining_quantity" numeric(20,8) NOT NULL,
    CONSTRAINT "tax_lots_cost_basis_check" CHECK ((("cost_basis")::numeric >= (0)::numeric)),
    CONSTRAINT "tax_lots_original_quantity_check" CHECK ((("original_quantity")::numeric > (0)::numeric)),
    CONSTRAINT "tax_lots_remaining_quantity_check" CHECK ((("remaining_quantity")::numeric >= (0)::numeric))
);


ALTER TABLE "public"."tax_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(20,8) NOT NULL,
    "amount" numeric(16,4) NOT NULL,
    "currency_code" character varying(10) NOT NULL
);


ALTER TABLE "public"."transaction_legs" OWNER TO "postgres";


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


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."dnse_orders"
    ADD CONSTRAINT "dnse_orders_pkey" PRIMARY KEY ("id");



CREATE POLICY "Users can read DNSE orders" ON "public"."dnse_orders" TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."call_vercel_revalidate"() TO "anon";
GRANT ALL ON FUNCTION "public"."call_vercel_revalidate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_vercel_revalidate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_debts"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_debts"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_debts"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_user_id" "uuid", "p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_user_id" "uuid", "p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_user_id" "uuid", "p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_user_id" "uuid", "p_ticker" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_user_id" "uuid", "p_ticker" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_user_id" "uuid", "p_ticker" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date", "end_date" "date", "asset_class_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date", "end_date" "date", "asset_class_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date", "end_date" "date", "asset_class_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_exchange_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_exchange_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_exchange_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_stock_price"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_stock_price"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_stock_price"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_assets_after_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_assets_after_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_assets_after_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) TO "service_role";
























GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."daily_crypto_prices" TO "anon";
GRANT ALL ON TABLE "public"."daily_crypto_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_crypto_prices" TO "service_role";



GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."daily_market_indices" TO "anon";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "service_role";



GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."daily_stock_prices" TO "anon";
GRANT ALL ON TABLE "public"."daily_stock_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_stock_prices" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_orders" TO "anon";
GRANT ALL ON TABLE "public"."dnse_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_orders" TO "service_role";



GRANT ALL ON TABLE "public"."lot_consumptions" TO "anon";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."securities" TO "anon";
GRANT ALL ON TABLE "public"."securities" TO "authenticated";
GRANT ALL ON TABLE "public"."securities" TO "service_role";



GRANT ALL ON TABLE "public"."tax_lots" TO "anon";
GRANT ALL ON TABLE "public"."tax_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_lots" TO "service_role";



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

