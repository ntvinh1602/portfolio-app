


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
    'fund',
    'equity',
    'liability',
    'index'
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
    'income',
    'expense',
    'borrow',
    'repay',
    'split'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_borrow_transaction"("p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_debts_asset_id uuid;
  v_transaction_id uuid;
  v_debt_id uuid;
BEGIN
  -- 1. Get debts asset
  v_debts_asset_id := public.get_asset_id_from_ticker('DEBTS');

  -- 2. Create the transaction
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
    p_transaction_date,
    'borrow',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;
  
  -- 3. Create the debt record
  INSERT INTO public.debts (lender_name, principal_amount, currency_code, interest_rate, borrow_txn_id)
  VALUES (
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    v_transaction_id
  ) RETURNING id INTO v_debt_id;

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


ALTER FUNCTION "public"."add_borrow_transaction"("p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_buy_transaction"("p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
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
  v_purchased_asset_currency := public.get_asset_currency(p_asset_id);
  v_cash_asset_currency := public.get_asset_currency(p_cash_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

  -- 2. Calculate the total proceeds in the native currency
  v_total_proceeds_native_currency := p_quantity * p_price;

  -- 3. Create transaction
  INSERT INTO public.transactions (transaction_date, type, description, price, created_at)
  VALUES (
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
      WHERE asset_id = p_cash_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_spend <= 0 THEN EXIT;
      END IF;
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
      -- Credit cash asset' 
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
  INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
  VALUES (
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


ALTER FUNCTION "public"."add_buy_transaction"("p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_deposit_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
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
  v_asset_currency := public.get_asset_currency(p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');
  
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
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
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
    INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
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


ALTER FUNCTION "public"."add_deposit_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"(), "p_linked_txn" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cash_asset_currency text;
  v_transaction_id uuid;
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
  v_cash_asset_currency := public.get_asset_currency(p_asset_id);

  -- 2. Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

  -- 3. Calculate the amount in VND
  IF v_cash_asset_currency = 'VND' THEN
    v_calculated_amount := p_quantity;
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

  -- 4. Create transaction (now with linked_txn support)
  INSERT INTO public.transactions (transaction_date, type, description, created_at, linked_txn)
  VALUES (
    p_transaction_date,
    'expense',
    p_description,
    p_created_at,
    p_linked_txn
  ) RETURNING id INTO v_transaction_id;

  -- 5. FX Gain/Loss logic for non-VND cash expenses
  IF v_cash_asset_currency != 'VND' THEN
    v_remaining_quantity_to_spend := p_quantity;

    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;

    FOR v_lot IN
      SELECT * FROM public.tax_lots
      WHERE asset_id = p_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      EXIT WHEN v_remaining_quantity_to_spend <= 0;

      v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;

      UPDATE public.tax_lots 
      SET remaining_quantity = remaining_quantity - v_quantity_from_lot 
      WHERE id = v_lot.id;

      INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) 
      VALUES (v_lot.id, v_quantity_from_lot);

      v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
      v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
    END LOOP;

    IF v_remaining_quantity_to_spend > 0 THEN
      RAISE EXCEPTION 'Not enough cash for expense. Tried %, available %.', p_quantity, (p_quantity - v_remaining_quantity_to_spend);
    END IF;

    v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;

    -- Credit the cash asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_total_cost_basis * -1,
      v_cash_asset_currency
    ) RETURNING id INTO v_asset_leg_id;

    -- Realized FX gain/loss
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

    -- Lot consumptions
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
      INSERT INTO public.lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
      VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;

  -- 6. Standard expense logic for VND
  ELSE
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_transaction_id,
      p_asset_id,
      p_quantity * -1,
      v_calculated_amount * -1,
      v_cash_asset_currency
    );
  END IF;

  -- 7. Debit Owner Capital for the expense
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES (
    v_transaction_id,
    v_owner_capital_asset_id,
    v_calculated_amount,
    v_calculated_amount,
    'VND'
  );

  RETURN v_transaction_id;
END;
$$;


ALTER FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone, "p_linked_txn" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_income_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_asset_currency := public.get_asset_currency(p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

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
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
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
    INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
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


ALTER FUNCTION "public"."add_income_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_debts_asset_id := public.get_asset_id_from_ticker('DEBTS');
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

  -- 2. Calculate the total payment amount
  v_total_payment := p_paid_principal + p_paid_interest;

  -- 3. Create a new transactions record
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
    p_txn_date,
    'repay',
    p_description,
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
  p_paid_principal,
  p_paid_principal,
  'VND'),
  -- Debit: Decrease Owner Capital for interest portion
  (v_transaction_id,
  v_owner_capital_asset_id,
  p_paid_interest,
  p_paid_interest,
  'VND');

  -- 5. Mark the debt as paid
  UPDATE public.debts SET repay_txn_id = v_transaction_id WHERE id = p_debt_id;
END;
$$;


ALTER FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_sell_transaction"("p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
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
  v_sold_asset_currency := public.get_asset_currency(p_asset_id);
  v_cash_asset_currency := public.get_asset_currency(p_cash_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

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
    WHERE asset_id = p_asset_id AND remaining_quantity > 0
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
  INSERT INTO public.transactions (transaction_date, type, description, price, created_at)
  VALUES (
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
    INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
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


ALTER FUNCTION "public"."add_sell_transaction"("p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_split_transaction"("p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_asset_currency := public.get_asset_currency(p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

  -- 2. Create transaction
  INSERT INTO public.transactions (transaction_date, type, description, created_at) VALUES (
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
  INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (
    p_asset_id,
    v_transaction_id,
    p_transaction_date,
    p_quantity,
    p_quantity,
    0
  );
END;
$$;


ALTER FUNCTION "public"."add_split_transaction"("p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_withdraw_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
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
  v_cash_asset_currency := public.get_asset_currency(p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');
  
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
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
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
      WHERE asset_id = p_asset_id AND remaining_quantity > 0
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


ALTER FUNCTION "public"."add_withdraw_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assets_quantity_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.refresh_assets_quantity();
  RETURN NULL; -- we don't need to return the row, just execute side-effect
END;
$$;


ALTER FUNCTION "public"."assets_quantity_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
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
  FROM public.daily_performance_snapshots
  WHERE date < p_start_date
  ORDER BY date DESC
  LIMIT 1;

  -- If no prior snapshot, this is the first month.
  -- Use the opening equity of the first day as the starting equity.
  IF v_start_equity IS NULL THEN
    SELECT (net_equity_value - net_cash_flow) INTO v_start_equity
    FROM public.daily_performance_snapshots
    WHERE date >= p_start_date
    ORDER BY date ASC
    LIMIT 1;
  END IF;

  -- Get ending equity (closing equity of the end date)
  SELECT net_equity_value INTO v_end_equity
  FROM public.daily_performance_snapshots
  WHERE date <= p_end_date
  ORDER BY date DESC
  LIMIT 1;

  -- Get net cash flow for the period
  SELECT COALESCE(SUM(net_cash_flow), 0) INTO v_cash_flow
  FROM public.daily_performance_snapshots
  WHERE date >= p_start_date AND date <= p_end_date;

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
  FROM public.daily_performance_snapshots
  WHERE date < p_start_date
  ORDER BY date DESC
  LIMIT 1;
  -- If no prior snapshot, this is the first month.
  -- The starting index is conceptually 100 before the first day.
  IF v_start_index IS NULL THEN v_start_index := 100;
  END IF;
  -- Get the equity index at the end of the period
  SELECT equity_index INTO v_end_index
  FROM public.daily_performance_snapshots
  WHERE date <= p_end_date
  ORDER BY date DESC
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


CREATE OR REPLACE FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  loop_date date;
  v_total_assets_value numeric;
  v_total_liabilities_value numeric;
  v_net_cash_flow numeric;
  v_total_cashflow numeric;
  v_net_equity_value numeric;
  v_previous_equity_value numeric;
  v_previous_equity_index numeric;
  v_previous_total_cashflow numeric;
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
        a.id,
        a.currency_code,
        SUM(tl.quantity) AS total_quantity
      FROM transaction_legs tl
      JOIN transactions t ON tl.transaction_id = t.id
      JOIN assets a ON tl.asset_id = a.id
      WHERE t.transaction_date <= loop_date
        AND a.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.id, a.currency_code
    )
    SELECT COALESCE(SUM(
      ua.total_quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)
    ), 0)
    INTO v_total_assets_value
    FROM user_assets ua
    LEFT JOIN LATERAL (
      SELECT price FROM public.daily_security_prices
      WHERE asset_id = ua.id AND date <= loop_date
      ORDER BY date DESC
      LIMIT 1
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT rate FROM public.daily_exchange_rates
      WHERE currency_code = ua.currency_code AND date <= loop_date
      ORDER BY date DESC
      LIMIT 1
    ) er ON TRUE;

    -- Calculate total liabilities value for the day
    WITH historical_debt_balances AS (
      SELECT
        d.id,
        d.principal_amount,
        d.interest_rate,
        tb.transaction_date AS start_date,
        tr.transaction_date AS end_date,
        CASE
          WHEN tr.transaction_date IS NOT NULL AND tr.transaction_date <= loop_date THEN 0
          ELSE d.principal_amount
        END AS balance_at_date
      FROM debts d
      JOIN transactions tb ON tb.id = d.borrow_txn_id
      LEFT JOIN transactions tr ON tr.id = d.repay_txn_id
      WHERE tb.transaction_date <= loop_date
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN hdb.balance_at_date > 0 THEN
          hdb.balance_at_date * POWER(1 + (hdb.interest_rate / 100 / 365), (loop_date - hdb.start_date))
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
    WHERE t.transaction_date = loop_date
      AND t.type IN ('deposit', 'withdraw')
      AND a.asset_class IN ('cash', 'fund', 'crypto');

    -- Retrieve previous day's data
    SELECT net_equity_value, equity_index, total_cashflow
    INTO v_previous_equity_value, v_previous_equity_index, v_previous_total_cashflow
    FROM daily_performance_snapshots
    WHERE date < loop_date
    ORDER BY date DESC
    LIMIT 1;

    -- Calculate equity value
    v_net_equity_value := v_total_assets_value - v_total_liabilities_value;

    -- Calculate cumulative cashflow
    IF v_previous_total_cashflow IS NULL THEN
      v_total_cashflow := v_net_cash_flow;
    ELSE
      v_total_cashflow := v_previous_total_cashflow + v_net_cash_flow;
    END IF;

    -- Calculate Equity Index
    IF v_previous_equity_value IS NULL THEN
      v_equity_index := 100; -- first snapshot
    ELSE
      IF v_previous_equity_value = 0 THEN
        v_daily_return := 0;
      ELSE
        v_daily_return := (v_net_equity_value - v_net_cash_flow - v_previous_equity_value) / v_previous_equity_value;
      END IF;
      v_equity_index := v_previous_equity_index * (1 + v_daily_return);
    END IF;

    -- Insert or update the snapshot for the day
    INSERT INTO daily_performance_snapshots (date, net_equity_value, net_cash_flow, total_cashflow, equity_index)
    VALUES (
      loop_date,
      v_net_equity_value,
      v_net_cash_flow,
      v_total_cashflow,
      v_equity_index
    )
    ON CONFLICT (date) DO UPDATE
    SET net_equity_value = EXCLUDED.net_equity_value,
        net_cash_flow = EXCLUDED.net_cash_flow,
        total_cashflow = EXCLUDED.total_cashflow,
        equity_index = EXCLUDED.equity_index;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.transaction_legs
  WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM public.transactions);
  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_currency text;
BEGIN
  SELECT a.currency_code INTO v_currency
  FROM public.assets a
  WHERE a.id = p_asset_id;
  RETURN v_currency;
END;
$$;


ALTER FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT a.id INTO v_id FROM public.assets a WHERE a.ticker = p_ticker;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Asset for ticker % not found', p_ticker;
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_balance_sheet"() RETURNS json
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
  margin numeric;
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
    SELECT a.asset_class, sum(tl.amount) as total
    FROM public.transaction_legs tl
    JOIN public.assets a ON tl.asset_id = a.id
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) as cb_totals;

  -- Calculate market value totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(mv_totals.asset_class, mv_totals.total), '{}'::jsonb)
  INTO asset_mv_by_class
  FROM (
    SELECT
      a.asset_class,
      SUM(
        a.current_quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)
      ) AS total
    FROM public.assets a
    LEFT JOIN LATERAL (
      SELECT price
      FROM public.daily_security_prices
      WHERE asset_id = a.id
      ORDER BY date DESC
      LIMIT 1
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT rate
      FROM public.daily_exchange_rates
      WHERE currency_code = a.currency_code
      ORDER BY date DESC
      LIMIT 1
    ) er ON TRUE
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) mv_totals;

  -- Calculate total asset cost basis
  total_assets_cb := (coalesce((asset_cb_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'fund')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'crypto')::numeric, 0));
  -- Calculate total asset market value
  total_assets_mv := (coalesce((asset_mv_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'fund')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'crypto')::numeric, 0));
  -- Calculate liability values
  margin := 0 - LEAST(coalesce((asset_mv_by_class->>'cash')::numeric, 0), 0);
  SELECT a.current_quantity * -1 INTO debts_principal
  FROM public.assets a
  WHERE a.ticker = 'DEBTS';
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(
    d.principal_amount * (
      POWER(1 + (d.interest_rate / 100 / 365),
        (CURRENT_DATE - tb.transaction_date)
      ) - 1
    )
  ), 0)
  INTO accrued_interest
  FROM public.debts d
  JOIN public.transactions tb ON tb.id = d.borrow_txn_id
  LEFT JOIN public.transactions tr ON tr.id = d.repay_txn_id
  WHERE tr.id IS NULL OR tr.transaction_date > CURRENT_DATE;
  liability_total := margin + debts_principal + accrued_interest;
  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  WHERE a.ticker = 'CAPITAL';
  unrealized_pl := total_assets_mv - total_assets_cb - accrued_interest;
  equity_total := owner_capital + unrealized_pl;
  
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object(
        'type', 'Cash',
        'totalAmount', GREATEST(coalesce((asset_mv_by_class->>'cash')::numeric, 0), 0)
      ),
      json_build_object(
        'type', 'Stocks',
        'totalAmount', coalesce((asset_mv_by_class->>'stock')::numeric, 0)),
      json_build_object(
        'type', 'Fund',
        'totalAmount', coalesce((asset_mv_by_class->>'fund')::numeric, 0)),
      json_build_object(
        'type', 'Crypto',
        'totalAmount', coalesce((asset_mv_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', total_assets_mv,
    'liabilities', json_build_array(
      json_build_object('type', 'Margin', 'totalAmount', margin),
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


ALTER FUNCTION "public"."get_balance_sheet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "portfolio_value" numeric, "vni_value" numeric)
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
        FROM public.daily_performance_snapshots;
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
    FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "currency_code" "text", "quantity" numeric, "cost_basis" numeric, "price" numeric, "fx_rate" numeric, "market_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT
      a.id AS asset_id,
      public.get_security_price(a.id) AS price,
      public.get_fx_rate(a.currency_code) AS fx_rate
    FROM public.assets a
    WHERE a.asset_class = 'crypto'
  )
  SELECT
    a.ticker,
    a.name,
    a.logo_url,
    a.currency_code,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.price,
    ld.fx_rate,
    SUM(tl.quantity) * ld.price * ld.fx_rate AS market_value
  FROM public.assets a
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.asset_id = a.id
  WHERE a.asset_class = 'crypto'
  GROUP BY a.id, a.ticker, a.name, a.logo_url, a.currency_code, ld.price, ld.fx_rate
  HAVING SUM(tl.quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."get_crypto_holdings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "net_equity_value" numeric, "total_cashflow" numeric)
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
        FROM public.daily_performance_snapshots;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call sampling_equity_data() and include total_cashflow
    RETURN QUERY
    SELECT
      label AS range_label,
      s.date AS snapshot_date,
      s.net_equity_value,
      s.total_cashflow
    FROM public.sampling_equity_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fx_rate"("p_currency_code" "text", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (
      SELECT rate FROM public.daily_exchange_rates
      WHERE currency_code = p_currency_code AND date <= p_date
      ORDER BY date DESC
      LIMIT 1
    ), 1
  );
$$;


ALTER FUNCTION "public"."get_fx_rate"("p_currency_code" "text", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pnl"() RETURNS TABLE("range_label" "text", "pnl" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', 'ytd', 'mtd'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- Determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN 'ytd' THEN start_date := date_trunc('year', end_date);
      WHEN 'mtd' THEN start_date := date_trunc('month', end_date);
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT label, public.calculate_pnl(start_date, end_date);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_pnl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_price"("p_asset_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT price
     FROM public.daily_security_prices
     WHERE asset_id = p_asset_id
     ORDER BY date DESC
     LIMIT 1), 1
  );
$$;


ALTER FUNCTION "public"."get_security_price"("p_asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "price" numeric, "market_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT 
      a.id AS asset_id, 
      public.get_security_price(a.id) AS price
    FROM public.assets a
    WHERE a.asset_class = 'stock'
  )
  SELECT
    a.ticker,
    a.name,
    a.logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.price,
    SUM(tl.quantity) * ld.price AS market_value
  FROM public.assets a
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.asset_id = a.id
  WHERE a.asset_class = 'stock'
  GROUP BY a.id, a.ticker, a.name, a.logo_url, ld.price
  HAVING SUM(tl.quantity) > 0;
END;
$$;


ALTER FUNCTION "public"."get_stock_holdings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  legs jsonb;
  expenses jsonb := '[]'::jsonb;
begin
  -- fetch all transaction legs with their assets
  select coalesce(jsonb_agg(t), '[]'::jsonb)
  into legs
  from (
    select
      tl.id,
      tl.amount,
      tl.quantity,
      jsonb_build_object(
        'asset_class', a.asset_class,
        'name', a.name,
        'ticker', a.ticker,
        'logo_url', a.logo_url
      ) as assets
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where tl.transaction_id = txn_id
  ) t;

  -- fetch associated expenses if requested
  if include_expenses then
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    into expenses
    from (
      select
        tr.description,
        jsonb_agg(
          jsonb_build_object('amount', tl.amount)
        ) as transaction_legs
      from transactions tr
      join transaction_legs tl on tr.id = tl.transaction_id
      where tr.linked_txn = txn_id
      group by tr.description
    ) e;
  end if;

  return jsonb_build_object(
    'legs', legs,
    'expenses', expenses
  );
end;
$$;


ALTER FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("id" "uuid", "transaction_date" "date", "type" "text", "description" "text")
    LANGUAGE "sql"
    AS $$
  SELECT
    t.id,
    t.transaction_date,
    t.type::text,
    t.description
  FROM transactions AS t
  WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.linked_txn is NULL
  ORDER BY t.created_at DESC;
$$;


ALTER FUNCTION "public"."get_transactions"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_twr"() RETURNS TABLE("range_label" "text", "twr" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', 'ytd'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- Determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN 'ytd' THEN start_date := date_trunc('year', end_date);
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT label, public.calculate_twr(start_date, end_date);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_twr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_txn_record jsonb;
  v_txn_type text;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_debt_id uuid;
  v_asset_ticker text;
  v_cash_asset_ticker text;
  v_lender_name text;
BEGIN
  IF NOT jsonb_typeof(p_txn_data) = 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of transactions.';
  END IF;

  -- Temporarily disable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions DISABLE TRIGGER USER;

  FOR v_txn_record IN SELECT * FROM jsonb_array_elements(p_txn_data)
  LOOP
    v_txn_type := v_txn_record->>'type';

    v_asset_ticker := v_txn_record->>'asset_ticker';
    IF v_asset_ticker IS NOT NULL THEN
      v_asset_id := public.get_asset_id_from_ticker(v_asset_ticker);
    END IF;

    v_cash_asset_ticker := v_txn_record->>'cash_asset_ticker';
    IF v_cash_asset_ticker IS NOT NULL THEN
      v_cash_asset_id := public.get_asset_id_from_ticker(v_cash_asset_ticker);
    END IF;

    CASE v_txn_type
      WHEN 'buy' THEN PERFORM "public"."add_buy_transaction"(
        (v_txn_record->>'date')::date,
        v_asset_id,
        v_cash_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'price')::numeric,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'sell' THEN PERFORM "public"."add_sell_transaction"(
        v_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'price')::numeric,
        (v_txn_record->>'date')::date,
        v_cash_asset_id,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'deposit' THEN PERFORM "public"."add_deposit_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'withdraw' THEN PERFORM "public"."add_withdraw_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'repay' THEN
        v_lender_name := v_txn_record->>'counterparty';
        SELECT id INTO v_debt_id
        FROM public.debts
        WHERE lender_name = v_lender_name AND repay_txn_id is null;
        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
        END IF;
        PERFORM "public"."add_repay_transaction"(
          v_debt_id,
          (v_txn_record->>'principal')::numeric,
          (v_txn_record->>'interest')::numeric,
          (v_txn_record->>'date')::date,
          v_cash_asset_id,
          v_txn_record->>'description',
          (v_txn_record->>'created_at')::timestamptz
        );
      WHEN 'income' THEN
        PERFORM "public"."add_income_transaction"(
          (v_txn_record->>'date')::date,
          (v_txn_record->>'quantity')::numeric,
          v_txn_record->>'description',
          v_cash_asset_id,
          'income',
          (v_txn_record->>'created_at')::timestamptz
        );
      WHEN 'expense' THEN PERFORM "public"."add_expense_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'borrow' THEN PERFORM "public"."add_borrow_transaction"(
        v_txn_record->>'counterparty',
        (v_txn_record->>'principal')::numeric,
        (v_txn_record->>'interest_rate')::numeric,
        (v_txn_record->>'date')::date,
        v_cash_asset_id,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'split' THEN PERFORM "public"."add_split_transaction"(
        v_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'date')::date,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      ELSE
        RAISE EXCEPTION 'Unknown transaction type: %', v_txn_type;
    END CASE;
  END LOOP;

  -- Re-enable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions ENABLE TRIGGER USER;
  
  -- Generate the performance snapshots in a single batch
  PERFORM public.generate_performance_snapshots(p_start_date, CURRENT_DATE);
END;
$$;


ALTER FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_dnse_orders"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  unprocessed_order RECORD;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_main_txn_id uuid; -- holds the buy/sell transaction id
BEGIN
  -- Get the VND cash asset ID for the user
  v_cash_asset_id := public.get_asset_id_from_ticker('VND');

  FOR unprocessed_order IN
    SELECT * FROM public.dnse_orders WHERE txn_created = false
  LOOP
    -- Get the asset_id for the security being traded
    v_asset_id := public.get_asset_id_from_ticker(unprocessed_order.symbol);

    -- Create a buy or sell transaction and capture its id
    IF unprocessed_order.side = 'NB' THEN
      SELECT public.add_buy_transaction(
        unprocessed_order.modified_date::date,
        v_asset_id,
        v_cash_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        'Buy ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      ) INTO v_main_txn_id;

    ELSIF unprocessed_order.side = 'NS' THEN
      SELECT public.add_sell_transaction(
        v_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        unprocessed_order.modified_date::date,
        v_cash_asset_id,
        'Sell ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      ) INTO v_main_txn_id;
    END IF;

    -- Create an expense transaction for the tax, if applicable
    IF unprocessed_order.tax > 0 THEN
      PERFORM public.add_expense_transaction(
        unprocessed_order.modified_date::date,
        unprocessed_order.tax,
        'Income tax',
        v_cash_asset_id,
        unprocessed_order.modified_date,
        v_main_txn_id  -- pass linked txn
      );
    END IF;

    -- Create an expense transaction for the fee, if applicable
    IF unprocessed_order.fee > 0 THEN
      PERFORM public.add_expense_transaction(
        unprocessed_order.modified_date::date,
        unprocessed_order.fee,
        'Transaction fee',
        v_cash_asset_id,
        unprocessed_order.modified_date,
        v_main_txn_id  -- pass linked txn
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


CREATE OR REPLACE FUNCTION "public"."refresh_assets_quantity"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.assets a
  SET current_quantity = CASE
    WHEN a.ticker = 'INTERESTS' THEN COALESCE((
      SELECT SUM(
          d.principal_amount * (
            POWER(1 + (d.interest_rate / 100 / 365),
              (CURRENT_DATE - tb.transaction_date)
            ) - 1
          )
      )
      FROM public.debts d
      JOIN public.transactions tb ON tb.id = d.borrow_txn_id
      LEFT JOIN public.transactions tr ON tr.id = d.repay_txn_id
      WHERE tr.id IS NULL OR tr.transaction_date > CURRENT_DATE
    ), 0)
    ELSE COALESCE((
      SELECT SUM(quantity)
      FROM public.transaction_legs tl
      WHERE tl.asset_id = a.id
    ), 0)
  END
  WHERE TRUE; -- explicitly mark it as intentional full-table update
END;
$$;


ALTER FUNCTION "public"."refresh_assets_quantity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "portfolio_value" numeric, "vni_value" numeric)
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
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date
  ORDER BY dps.date
  LIMIT 1;

  SELECT md.close INTO v_first_vni_value
  FROM public.daily_market_indices md
  WHERE md.symbol = 'VNINDEX' AND md.date >= p_start_date
  ORDER BY md.date
  LIMIT 1;

  -- Create a temporary table to hold the raw, joined, and normalized data
  CREATE TEMP TABLE raw_data AS
  WITH portfolio_data AS (
    SELECT
      dps.date,
      dps.equity_index
    FROM public.daily_performance_snapshots dps
    WHERE dps.date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT
      md.date,
      md.close
    FROM public.daily_market_indices md
    WHERE md.symbol = 'VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    pd.date,
    (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 as portfolio_value,
    (vni.close / NULLIF(v_first_vni_value, 0)) * 100 as vni_value,
    ROW_NUMBER() OVER (ORDER BY pd.date) as rn
  FROM portfolio_data pd
  INNER JOIN vni_data vni ON pd.date = vni.date
  ORDER BY pd.date;

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

    IF range_end > data_count THEN range_end := data_count;
    END IF;
    
    IF range_start > range_end THEN CONTINUE;
    END IF;

    SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    SELECT AVG(rd.portfolio_value) INTO avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    -- Find the point with the largest triangle area based on portfolio_value
    max_area := -1;

    SELECT * INTO result_data
    FROM result_data_temp
    ORDER BY date
    DESC LIMIT 1;

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


ALTER FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric, "total_cashflow" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  data_count INT;
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
  -- Create temp table with both equity and total_cashflow
  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.date,
    dps.net_equity_value::numeric AS net_equity_value,
    dps.total_cashflow::numeric AS total_cashflow,
    ROW_NUMBER() OVER (ORDER BY dps.date) AS rn
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date AND dps.date <= p_end_date
  ORDER BY dps.date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If data below threshold, return all
  IF data_count <= p_threshold THEN
    RETURN QUERY
    SELECT rd.date, rd.net_equity_value, rd.total_cashflow
    FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- Temporary result table
  CREATE TEMP TABLE result_data_temp (
    date DATE,
    net_equity_value NUMERIC,
    total_cashflow NUMERIC
  );

  -- Always add first point
  INSERT INTO result_data_temp
  SELECT rd.date, rd.net_equity_value, rd.total_cashflow
  FROM raw_data rd
  WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    -- Compute average for the next bucket
    SELECT
      AVG(EXTRACT(EPOCH FROM rd.date)),
      AVG(rd.net_equity_value)
    INTO avg_x, avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    max_area := -1;
    SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;

    FOR data IN
      SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.net_equity_value - result_data.net_equity_value) -
        (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.net_equity_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp (date, net_equity_value, total_cashflow)
    VALUES (point_to_add.date, point_to_add.net_equity_value, point_to_add.total_cashflow);

    a := a + 1;
  END LOOP;

  -- Always add last point
  INSERT INTO result_data_temp
  SELECT rd.date, rd.net_equity_value, rd.total_cashflow
  FROM raw_data rd
  WHERE rn = data_count;

  -- Return the final sampled points
  RETURN QUERY
  SELECT * FROM result_data_temp ORDER BY date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;


ALTER FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshots_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_date date;
BEGIN
  -- Try to get NEW.date if it exists
  BEGIN
    v_date := NEW.date;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist → try transaction_id lookup
      IF NEW.transaction_id IS NOT NULL THEN
        SELECT t.transaction_date
        INTO v_date
        FROM public.transactions t
        WHERE t.id = NEW.transaction_id;
      END IF;
  END;

  -- Run both snapshot generators
  IF v_date IS NOT NULL THEN
    PERFORM public.generate_performance_snapshots(v_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."snapshots_trigger"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "current_quantity" numeric(20,8) DEFAULT 0 NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" "text" NOT NULL,
    "logo_url" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."daily_performance_snapshots" (
    "date" "date" NOT NULL,
    "net_equity_value" numeric(16,4) NOT NULL,
    "net_cash_flow" numeric(16,4) NOT NULL,
    "equity_index" numeric(8,2),
    "total_cashflow" numeric
);


ALTER TABLE "public"."daily_performance_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_security_prices" (
    "asset_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);


ALTER TABLE "public"."daily_security_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lender_name" "text" NOT NULL,
    "principal_amount" numeric(16,4) NOT NULL,
    "currency_code" "text" NOT NULL,
    "interest_rate" numeric(4,2) DEFAULT 0 NOT NULL,
    "borrow_txn_id" "uuid",
    "repay_txn_id" "uuid"
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dnse_orders" (
    "id" bigint NOT NULL,
    "side" "text" NOT NULL,
    "symbol" "text" NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(20,8) NOT NULL,
    "amount" numeric(16,4) NOT NULL,
    "currency_code" "text" NOT NULL
);


ALTER TABLE "public"."transaction_legs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_date" "date" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "price" numeric(16,4),
    "linked_txn" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_snapshots" WITH ("security_invoker"='on') AS
 WITH "month_ranges" AS (
         SELECT ("date_trunc"('month'::"text", "dd"."dd"))::"date" AS "month_start",
            LEAST((("date_trunc"('month'::"text", "dd"."dd") + '1 mon -1 days'::interval))::"date", CURRENT_DATE) AS "month_end"
           FROM "generate_series"(('2021-11-01'::"date")::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) "dd"("dd")
        )
 SELECT "m"."month_start" AS "date",
    "public"."calculate_pnl"("m"."month_start", "m"."month_end") AS "pnl",
    ((COALESCE("lic"."total_interest", (0)::numeric) + COALESCE("oic"."margin_interest", (0)::numeric)) + COALESCE("oic"."cash_advance_interest", (0)::numeric)) AS "interest",
    COALESCE("tc"."total_taxes", (0)::numeric) AS "tax",
    COALESCE("tc"."total_fees", (0)::numeric) AS "fee"
   FROM ((("month_ranges" "m"
     LEFT JOIN LATERAL ( SELECT "sum"("tl"."amount") FILTER (WHERE ("t"."description" ~~* '%fee%'::"text")) AS "total_fees",
            "sum"("tl"."amount") FILTER (WHERE ("t"."description" ~~* '%tax%'::"text")) AS "total_taxes"
           FROM (("public"."transactions" "t"
             JOIN "public"."transaction_legs" "tl" ON (("t"."id" = "tl"."transaction_id")))
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE (("t"."transaction_date" >= "m"."month_start") AND ("t"."transaction_date" <= "m"."month_end") AND ("t"."type" = 'expense'::"public"."transaction_type") AND ("a"."ticker" = ANY (ARRAY['EARNINGS'::"text", 'CAPITAL'::"text"])))) "tc" ON (true))
     LEFT JOIN LATERAL ( SELECT "sum"("tl"."amount") AS "total_interest"
           FROM (("public"."transactions" "t"
             JOIN "public"."transaction_legs" "tl" ON (("t"."id" = "tl"."transaction_id")))
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE (("t"."transaction_date" >= "m"."month_start") AND ("t"."transaction_date" <= "m"."month_end") AND ("t"."type" = 'repay'::"public"."transaction_type") AND ("a"."ticker" = ANY (ARRAY['EARNINGS'::"text", 'CAPITAL'::"text"])))) "lic" ON (true))
     LEFT JOIN LATERAL ( SELECT "sum"("tl"."amount") FILTER (WHERE ("t"."description" ~~* '%Margin%'::"text")) AS "margin_interest",
            "sum"("tl"."amount") FILTER (WHERE ("t"."description" ~~* '%Cash advance%'::"text")) AS "cash_advance_interest"
           FROM (("public"."transactions" "t"
             JOIN "public"."transaction_legs" "tl" ON (("t"."id" = "tl"."transaction_id")))
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE (("t"."transaction_date" >= "m"."month_start") AND ("t"."transaction_date" <= "m"."month_end") AND ("t"."type" = 'expense'::"public"."transaction_type") AND ("a"."ticker" = ANY (ARRAY['EARNINGS'::"text", 'CAPITAL'::"text"])))) "oic" ON (true));


ALTER VIEW "public"."monthly_snapshots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_annual_pnl" WITH ("security_invoker"='on') AS
 WITH "capital_legs" AS (
         SELECT "tl"."transaction_id",
            "tl"."amount" AS "capital_amount",
            "t"."transaction_date"
           FROM ("public"."transaction_legs" "tl"
             JOIN "public"."transactions" "t" ON (("t"."id" = "tl"."transaction_id")))
          WHERE ("tl"."asset_id" = 'e39728be-0a37-4608-b30d-dabd1a4017ab'::"uuid")
        ), "stock_legs" AS (
         SELECT "tl"."transaction_id",
            "tl"."asset_id" AS "stock_id"
           FROM ("public"."transaction_legs" "tl"
             JOIN "public"."assets" "a_1" ON (("a_1"."id" = "tl"."asset_id")))
          WHERE ("a_1"."asset_class" = 'stock'::"public"."asset_class")
        )
 SELECT "a"."id" AS "asset_id",
    "a"."ticker",
    (EXTRACT(year FROM "c"."transaction_date"))::integer AS "year",
    (- "sum"("c"."capital_amount")) AS "total_pnl"
   FROM (("capital_legs" "c"
     JOIN "stock_legs" "s" ON (("s"."transaction_id" = "c"."transaction_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "s"."stock_id")))
  GROUP BY "a"."id", "a"."ticker", (EXTRACT(year FROM "c"."transaction_date"))
  ORDER BY ((EXTRACT(year FROM "c"."transaction_date"))::integer) DESC, (- "sum"("c"."capital_amount")) DESC;


ALTER VIEW "public"."stock_annual_pnl" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
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


CREATE OR REPLACE VIEW "public"."yearly_snapshots" WITH ("security_invoker"='on') AS
 WITH "annual_cashflow" AS (
         SELECT (EXTRACT(year FROM "daily_performance_snapshots"."date"))::integer AS "year",
            "sum"(
                CASE
                    WHEN ("daily_performance_snapshots"."net_cash_flow" > (0)::numeric) THEN "daily_performance_snapshots"."net_cash_flow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_performance_snapshots"."net_cash_flow" < (0)::numeric) THEN "daily_performance_snapshots"."net_cash_flow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_performance_snapshots"
          GROUP BY (EXTRACT(year FROM "daily_performance_snapshots"."date"))
        ), "equity_data" AS (
         SELECT EXTRACT(year FROM "daily_performance_snapshots"."date") AS "yr",
            "daily_performance_snapshots"."date" AS "dps_date",
            "daily_performance_snapshots"."equity_index"
           FROM "public"."daily_performance_snapshots"
          WHERE ("daily_performance_snapshots"."equity_index" IS NOT NULL)
        ), "equity_end_of_year" AS (
         SELECT "equity_data"."yr",
            "max"("equity_data"."dps_date") AS "last_date"
           FROM "equity_data"
          GROUP BY "equity_data"."yr"
        ), "equity_with_prev" AS (
         SELECT "e"."yr",
            "eoy"."last_date",
            "e"."equity_index" AS "end_value",
            "lag"("e"."equity_index") OVER (ORDER BY "e"."yr") AS "start_value"
           FROM ("equity_end_of_year" "eoy"
             JOIN "equity_data" "e" ON (("e"."dps_date" = "eoy"."last_date")))
        ), "vnindex_data" AS (
         SELECT EXTRACT(year FROM "daily_market_indices"."date") AS "yr",
            "daily_market_indices"."date" AS "dmi_date",
            "daily_market_indices"."close"
           FROM "public"."daily_market_indices"
          WHERE (("daily_market_indices"."symbol" = 'VNINDEX'::"text") AND ("daily_market_indices"."close" IS NOT NULL))
        ), "vnindex_end_of_year" AS (
         SELECT "vnindex_data"."yr",
            "max"("vnindex_data"."dmi_date") AS "last_date"
           FROM "vnindex_data"
          GROUP BY "vnindex_data"."yr"
        ), "vnindex_with_prev" AS (
         SELECT "v"."yr",
            "voy"."last_date",
            "v"."close" AS "end_value",
            "lag"("v"."close") OVER (ORDER BY "v"."yr") AS "start_value"
           FROM ("vnindex_end_of_year" "voy"
             JOIN "vnindex_data" "v" ON (("v"."dmi_date" = "voy"."last_date")))
        ), "yearly_returns" AS (
         SELECT (COALESCE("e"."yr", "v"."yr"))::integer AS "year",
            "round"(((("e"."end_value" - "e"."start_value") / "e"."start_value") * (100)::numeric), 2) AS "equity_ret",
            "round"(((("v"."end_value" - "v"."start_value") / "v"."start_value") * (100)::numeric), 2) AS "vn_ret"
           FROM ("equity_with_prev" "e"
             FULL JOIN "vnindex_with_prev" "v" ON (("e"."yr" = "v"."yr")))
          WHERE (("e"."start_value" IS NOT NULL) OR ("v"."start_value" IS NOT NULL))
        ), "all_time_cashflow" AS (
         SELECT "sum"(
                CASE
                    WHEN ("daily_performance_snapshots"."net_cash_flow" > (0)::numeric) THEN "daily_performance_snapshots"."net_cash_flow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_performance_snapshots"."net_cash_flow" < (0)::numeric) THEN "daily_performance_snapshots"."net_cash_flow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_performance_snapshots"
        ), "scalar_values" AS (
         SELECT ( SELECT "daily_performance_snapshots"."equity_index"
                   FROM "public"."daily_performance_snapshots"
                  ORDER BY "daily_performance_snapshots"."date"
                 LIMIT 1) AS "first_equity",
            ( SELECT "daily_performance_snapshots"."equity_index"
                   FROM "public"."daily_performance_snapshots"
                  ORDER BY "daily_performance_snapshots"."date" DESC
                 LIMIT 1) AS "last_equity",
            ( SELECT "daily_market_indices"."close"
                   FROM "public"."daily_market_indices"
                  WHERE ("daily_market_indices"."symbol" = 'VNINDEX'::"text")
                  ORDER BY "daily_market_indices"."date"
                 LIMIT 1) AS "first_vnindex",
            ( SELECT "daily_market_indices"."close"
                   FROM "public"."daily_market_indices"
                  WHERE ("daily_market_indices"."symbol" = 'VNINDEX'::"text")
                  ORDER BY "daily_market_indices"."date" DESC
                 LIMIT 1) AS "last_vnindex"
        ), "all_time" AS (
         SELECT 9999 AS "year",
            "round"(((("sv"."last_equity" - "sv"."first_equity") / "sv"."first_equity") * (100)::numeric), 2) AS "equity_ret",
            "round"(((("sv"."last_vnindex" - "sv"."first_vnindex") / "sv"."first_vnindex") * (100)::numeric), 2) AS "vn_ret",
            "ac"."deposits",
            "ac"."withdrawals"
           FROM ("scalar_values" "sv"
             CROSS JOIN "all_time_cashflow" "ac")
        ), "yearly_combined" AS (
         SELECT "yr"."year",
            "cf"."deposits",
            "cf"."withdrawals",
            "yr"."equity_ret",
            "yr"."vn_ret"
           FROM ("yearly_returns" "yr"
             LEFT JOIN "annual_cashflow" "cf" ON (("yr"."year" = "cf"."year")))
        ), "combined" AS (
         SELECT "yearly_combined"."year",
            "yearly_combined"."deposits",
            "yearly_combined"."withdrawals",
            "yearly_combined"."equity_ret",
            "yearly_combined"."vn_ret"
           FROM "yearly_combined"
        UNION ALL
         SELECT "all_time"."year",
            "all_time"."deposits",
            "all_time"."withdrawals",
            "all_time"."equity_ret",
            "all_time"."vn_ret"
           FROM "all_time"
        )
 SELECT
        CASE
            WHEN ("year" = 9999) THEN 'All-Time'::"text"
            ELSE ("year")::"text"
        END AS "year",
    "deposits",
    "withdrawals",
    "equity_ret",
    "vn_ret"
   FROM "combined"
  ORDER BY
        CASE
            WHEN ("year" = 9999) THEN 9999
            ELSE "year"
        END;


ALTER VIEW "public"."yearly_snapshots" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_ticker_key" UNIQUE ("ticker");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."daily_performance_snapshots"
    ADD CONSTRAINT "daily_performance_snapshots_pkey" PRIMARY KEY ("date");



ALTER TABLE ONLY "public"."daily_security_prices"
    ADD CONSTRAINT "daily_security_prices_pkey" PRIMARY KEY ("asset_id", "date");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dnse_orders"
    ADD CONSTRAINT "dnse_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency_code", "date");



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_pkey" PRIMARY KEY ("sell_transaction_leg_id", "tax_lot_id");



ALTER TABLE ONLY "public"."daily_market_indices"
    ADD CONSTRAINT "market_data_pkey" PRIMARY KEY ("date", "symbol");



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "debts_currency_code_idx" ON "public"."debts" USING "btree" ("currency_code");



CREATE INDEX "lot_consumptions_tax_lot_id_idx" ON "public"."lot_consumptions" USING "btree" ("tax_lot_id");



CREATE INDEX "tax_lots_asset_id_idx" ON "public"."tax_lots" USING "btree" ("asset_id");



CREATE INDEX "tax_lots_creation_transaction_id_idx" ON "public"."tax_lots" USING "btree" ("creation_transaction_id");



CREATE INDEX "transaction_legs_asset_id_idx" ON "public"."transaction_legs" USING "btree" ("asset_id");



CREATE INDEX "transaction_legs_currency_code_idx" ON "public"."transaction_legs" USING "btree" ("currency_code");



CREATE INDEX "transaction_legs_transaction_id_idx" ON "public"."transaction_legs" USING "btree" ("transaction_id");



CREATE OR REPLACE TRIGGER "refresh_assets_after_new_txn" AFTER INSERT OR DELETE OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "public"."assets_quantity_trigger"();



CREATE OR REPLACE TRIGGER "revalidate_after_new_fx_rate" AFTER INSERT OR UPDATE ON "public"."daily_exchange_rates" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://portapp-vinh.vercel.app/api/revalidate', 'POST', '{"Content-type":"application/json","x-secret-token":"8PuQYxYnnEH80AvU1HePoSCuorsEFc9d","x-table-name":"daily_exchange_rates"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "revalidate_after_new_prices" AFTER INSERT OR UPDATE ON "public"."daily_security_prices" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://portapp-vinh.vercel.app/api/revalidate', 'POST', '{"Content-type":"application/json","x-secret-token":"8PuQYxYnnEH80AvU1HePoSCuorsEFc9d","x-table-name":"daily_stock_prices"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "revalidate_after_new_txn" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://portapp-vinh.vercel.app/api/revalidate', 'POST', '{"Content-type":"application/json","x-secret-token":"8PuQYxYnnEH80AvU1HePoSCuorsEFc9d","x-table-name":"transaction_legs"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "snapshot_after_new_fx_rate" AFTER INSERT OR UPDATE ON "public"."daily_exchange_rates" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



CREATE OR REPLACE TRIGGER "snapshot_after_new_prices" AFTER INSERT OR UPDATE ON "public"."daily_security_prices" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



CREATE OR REPLACE TRIGGER "snapshot_after_new_txn" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "public"."snapshots_trigger"();



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_currency_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."daily_security_prices"
    ADD CONSTRAINT "daily_security_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_borrow_txn_id_fkey" FOREIGN KEY ("borrow_txn_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_repay_txn_id_fkey" FOREIGN KEY ("repay_txn_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dnse_orders"
    ADD CONSTRAINT "dnse_orders_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "public"."assets"("ticker") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_sell_transaction_leg_id_fkey" FOREIGN KEY ("sell_transaction_leg_id") REFERENCES "public"."transaction_legs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_tax_lot_id_fkey" FOREIGN KEY ("tax_lot_id") REFERENCES "public"."tax_lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_creation_transaction_id_fkey" FOREIGN KEY ("creation_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can access exchange rates" ON "public"."daily_exchange_rates" TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can access market indices" ON "public"."daily_market_indices" TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can access stock prices" ON "public"."daily_security_prices" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access assets" ON "public"."assets" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access currency" ON "public"."currencies" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access debts" ON "public"."debts" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access lot consumptions" ON "public"."lot_consumptions" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access performance snapshots" ON "public"."daily_performance_snapshots" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access tax lots" ON "public"."tax_lots" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access transaction legs" ON "public"."transaction_legs" TO "authenticated" USING (true);



CREATE POLICY "Logged in users can access transactions" ON "public"."transactions" TO "authenticated" USING (true);



CREATE POLICY "Users can read DNSE orders" ON "public"."dnse_orders" TO "authenticated" USING (true);



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_market_indices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_performance_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_security_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnse_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_consumptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_lots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_legs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_borrow_transaction"("p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_buy_transaction"("p_transaction_date" "date", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_deposit_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone, "p_linked_txn" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone, "p_linked_txn" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone, "p_linked_txn" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_income_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_sell_transaction"("p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_split_transaction"("p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_withdraw_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."assets_quantity_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."assets_quantity_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assets_quantity_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_balance_sheet"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_balance_sheet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_balance_sheet"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crypto_holdings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_crypto_holdings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crypto_holdings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fx_rate"("p_currency_code" "text", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_fx_rate"("p_currency_code" "text", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fx_rate"("p_currency_code" "text", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pnl"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pnl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pnl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_price"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_price"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_price"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stock_holdings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_twr"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_twr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_twr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_assets_quantity"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_assets_quantity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_assets_quantity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshots_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."snapshots_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshots_trigger"() TO "service_role";
























GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."daily_market_indices" TO "anon";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "service_role";



GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."daily_security_prices" TO "anon";
GRANT ALL ON TABLE "public"."daily_security_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_security_prices" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_orders" TO "anon";
GRANT ALL ON TABLE "public"."dnse_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_orders" TO "service_role";



GRANT ALL ON TABLE "public"."lot_consumptions" TO "anon";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_legs" TO "anon";
GRANT ALL ON TABLE "public"."transaction_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_legs" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "anon";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "service_role";



GRANT ALL ON TABLE "public"."tax_lots" TO "anon";
GRANT ALL ON TABLE "public"."tax_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_lots" TO "service_role";



GRANT ALL ON TABLE "public"."yearly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."yearly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."yearly_snapshots" TO "service_role";









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

