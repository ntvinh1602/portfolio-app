


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


CREATE OR REPLACE FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  legs jsonb;
begin
  -- fetch all transaction legs with their assets
  select coalesce(jsonb_agg(t), '[]'::jsonb)
  into legs
  from (
    select
      (tl.tx_id::text || '_' || tl.asset_id::text),
      tl.net_proceed,
      tl.quantity,
      jsonb_build_object(
        'asset_class', a.asset_class,
        'name', a.name,
        'ticker', a.ticker,
        'logo_url', a.logo_url
      ) as assets
    from tx_legs tl
    join assets a on tl.asset_id = a.id
    where tl.tx_id = txn_id
  ) t;

  return jsonb_build_object(
    'legs', legs
  );
end;
$$;


ALTER FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) OWNER TO "postgres";


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
    -- 1️⃣ Load transaction
    SELECT * INTO r FROM public.tx_cashflow WHERE tx_id = p_tx_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction % not found in tx_cashflow', p_tx_id;
    END IF;

    -- 2️⃣ Identify assets
    v_cash_asset := r.asset_id;
    SELECT currency_code INTO v_cash_currency FROM public.assets WHERE id = v_cash_asset;

    SELECT id INTO v_equity_asset FROM public.assets WHERE asset_class = 'equity' LIMIT 1;
    IF v_equity_asset IS NULL THEN
        RAISE EXCEPTION 'Missing equity asset';
    END IF;

    -- 3️⃣ Clear existing legs
    DELETE FROM public.tx_legs WHERE tx_id = p_tx_id;

    -- 4️⃣ Handle by operation type
    IF r.operation IN ('deposit', 'income') THEN
        -- Debit cash
        INSERT INTO public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        VALUES (r.tx_id, v_cash_asset, r.quantity, r.net_proceed);

        -- Credit equity (capital in)
        INSERT INTO public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        VALUES (r.tx_id, v_equity_asset, -r.net_proceed, -r.net_proceed);

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

    ELSIF r.operation IN ('withdraw', 'expense') THEN
        -- Credit cash (reduce balance)
        INSERT INTO public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        VALUES (r.tx_id, v_cash_asset, -r.quantity, -r.net_proceed);

        -- Debit equity (capital out)
        INSERT INTO public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        VALUES (r.tx_id, v_equity_asset, r.net_proceed, r.net_proceed);

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

    ELSE
        RAISE EXCEPTION 'Invalid operation %', r.operation;
    END IF;
END;
$$;


ALTER FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
    r tx_debt%rowtype;
    v_cash_asset uuid;
    v_debt_asset uuid;
    v_equity_asset uuid;
begin
    -- 1️⃣ Load transaction
    select * into r from public.tx_debt where tx_id = p_tx_id;
    if not found then
        raise exception 'Transaction % not found in tx_debt', p_tx_id;
    end if;

    -- 2️⃣ Resolve asset IDs
    select id into v_cash_asset from public.assets where asset_class = 'cash' and currency_code = 'VND' limit 1;
    select id into v_equity_asset from public.assets where asset_class = 'equity' limit 1;
    select id into v_debt_asset from public.assets where asset_class = 'liability' and ticker = 'DEBTS' limit 1;

    if v_cash_asset is null or v_debt_asset is null or v_equity_asset is null then
        raise exception 'Missing required assets (cash, debt, or equity)';
    end if;

    -- 3️⃣ Clear any prior legs for this transaction
    delete from public.tx_legs where tx_id = p_tx_id;

    -- 4️⃣ Process operation type
    if r.operation = 'borrow' then
        -- Borrow: receive cash, increase liability
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_cash_asset, r.net_proceed,  r.net_proceed);  -- Debit cash

        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_debt_asset, -r.net_proceed, -r.net_proceed);  -- Credit debt

    elsif r.operation = 'repay' then
        -- Repay: pay cash (reduce asset), reduce debt, record interest expense
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_cash_asset, -r.net_proceed, -r.net_proceed);  -- Credit cash (payment)

        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_debt_asset, r.principal,  r.principal);     -- Debit debt (liability reduced)

        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_equity_asset, r.interest,  r.interest);    -- Debit equity (interest expense)

    else
        raise exception 'Invalid debt operation: %', r.operation;
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
    -- 1️⃣ Load the transaction
    select * into r from public.tx_stock where tx_id = p_tx_id;
    if not found then
        raise exception 'Transaction % not found in tx_stock', p_tx_id;
    end if;

    -- 2️⃣ Resolve asset IDs
    select id into v_cash_asset from public.assets where asset_class = 'cash' and currency_code = 'VND' limit 1;
    select id into v_equity_asset from public.assets where asset_class = 'equity' limit 1;
    v_stock_asset := r.stock_id;

    if v_cash_asset is null or v_equity_asset is null then
        raise exception 'Missing required assets (cash or equity)';
    end if;

    -- 3️⃣ Fetch or initialize position
    select * into v_pos from public.asset_positions where asset_id = r.stock_id;
    if not found then
        insert into public.asset_positions (asset_id, quantity, average_cost)
        values (r.stock_id, 0, 0)
        returning * into v_pos;
    end if;

    -- 4️⃣ Process transaction
    if r.side = 'buy' then
        v_new_qty := v_pos.quantity + r.quantity;
        v_new_avg_cost :=
            case when v_new_qty = 0 then 0
                 else (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty
            end;

        update public.asset_positions
        set quantity = v_new_qty,
            average_cost = v_new_avg_cost
        where asset_id = r.stock_id;

        -- Generate double-entry legs for BUY
        delete from public.tx_legs where tx_id = p_tx_id;

        -- Debit stock (increase holdings)
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_stock_asset, r.quantity, r.net_proceed);

        -- Credit cash
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_cash_asset, -r.net_proceed, -r.net_proceed);

    elsif r.side = 'sell' then
        if v_pos.quantity < r.quantity then
            raise exception 'Not enough shares to sell for stock %', r.stock_id;
        end if;

        v_cost_basis := v_pos.average_cost * r.quantity;
        v_realized_gain := r.net_proceed - v_cost_basis;

        update public.asset_positions
        set quantity = v_pos.quantity - r.quantity
        where asset_id = r.stock_id;

        -- Generate double-entry legs for SELL
        delete from public.tx_legs where tx_id = p_tx_id;

        -- Debit cash
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed);

        -- Credit stock (reduce holdings)
        insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
        values (r.tx_id, v_stock_asset, -r.quantity, -v_cost_basis);

        -- Post gain/loss to equity
        if v_realized_gain <> 0 then
            insert into public.tx_legs (tx_id, asset_id, quantity, net_proceed)
            values (r.tx_id, v_equity_asset, -v_realized_gain, -v_realized_gain);
        end if;
    else
        raise exception 'Invalid side: %', r.side;
    end if;
end;
$$;


ALTER FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_daily_snapshots"("p_start_date" "date", "p_end_date" "date") RETURNS "void"
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
        SUM(tl.quantity) AS quantity
      FROM tx_legs tl
      JOIN tx_entries e ON tl.tx_id = e.id
      JOIN assets a ON tl.asset_id = a.id
      WHERE e.created_at::date <= loop_date
        AND a.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.id, a.currency_code
    )
    SELECT COALESCE(SUM(ua.quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)), 0)
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
        b.tx_id AS borrow_tx_id,
        b.principal,
        b.rate,
        e_b.created_at::date AS start_date,
        e_r.created_at::date AS end_date,
        CASE
          -- If repaid already and repayment date <= today, balance is 0
          WHEN e_r.created_at IS NOT NULL AND e_r.created_at::date <= loop_date THEN 0
          ELSE b.principal
        END AS balance_at_date
      FROM public.tx_debt b
      JOIN public.tx_entries e_b ON e_b.id = b.tx_id
      LEFT JOIN public.tx_debt r ON r.repay_tx = b.tx_id AND r.operation = 'repay'
      LEFT JOIN public.tx_entries e_r ON e_r.id = r.tx_id
      WHERE b.operation = 'borrow'
        AND e_b.created_at::date <= loop_date
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN hdb.balance_at_date > 0 THEN
          hdb.balance_at_date * POWER(1 + (hdb.rate / 100 / 365), (loop_date - hdb.start_date))
        ELSE 0
      END
    ), 0) AS total_liabilities_value
    INTO v_total_liabilities_value
    FROM historical_debt_balances hdb;

    -- Calculate net cash flow for the day
    SELECT COALESCE(SUM(tl.net_proceed), 0)
    INTO v_net_cash_flow
    FROM tx_entries e
    JOIN tx_legs tl ON e.id = tl.tx_id
    JOIN assets a ON tl.asset_id = a.id
    JOIN tx_cashflow cf ON cf.tx_id = e.id
    WHERE e.created_at::date = loop_date
      AND cf.operation IN ('deposit', 'withdraw')
      AND a.asset_class IN ('cash', 'fund', 'crypto');

    -- Retrieve previous day's data
    SELECT net_equity, equity_index, cumulative_cashflow
    INTO v_previous_equity_value, v_previous_equity_index, v_previous_total_cashflow
    FROM daily_snapshots
    WHERE snapshot_date < loop_date
    ORDER BY snapshot_date DESC
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
    INSERT INTO daily_snapshots (
      snapshot_date,
      total_assets,
      total_liabilities,
      net_equity,
      net_cashflow,
      cumulative_cashflow,
      equity_index
    )
    VALUES (
      loop_date,
      v_total_assets_value,
      v_total_liabilities_value,
      v_net_equity_value,
      v_net_cash_flow,
      v_total_cashflow,
      v_equity_index
    )
    ON CONFLICT (snapshot_date) DO UPDATE
    SET
      total_assets = EXCLUDED.total_assets,
      total_liabilities = EXCLUDED.total_liabilities,
      net_equity = EXCLUDED.net_equity,
      net_cashflow = EXCLUDED.net_cashflow,
      cumulative_cashflow = EXCLUDED.cumulative_cashflow,
      equity_index = EXCLUDED.equity_index;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rebuild_daily_snapshots"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("snapshot_date" "date", "portfolio_value" numeric, "vni_value" numeric)
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
  FROM public.daily_snapshots dps
  WHERE dps.snapshot_date >= p_start_date
  ORDER BY dps.snapshot_date
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
      dps.snapshot_date,
      dps.equity_index
    FROM public.daily_snapshots dps
    WHERE dps.snapshot_date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT
      md.date,
      md.close
    FROM public.daily_market_indices md
    WHERE md.symbol = 'VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    pd.snapshot_date,
    (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 as portfolio_value,
    (vni.close / NULLIF(v_first_vni_value, 0)) * 100 as vni_value,
    ROW_NUMBER() OVER (ORDER BY pd.snapshot_date) as rn
  FROM portfolio_data pd
  INNER JOIN vni_data vni ON pd.snapshot_date = vni.date
  ORDER BY pd.snapshot_date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If the data count is below the threshold, return all points
  IF data_count <= p_threshold THEN
    RETURN QUERY SELECT rd.snapshot_date, rd.portfolio_value, rd.vni_value FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- LTTB Downsampling
  CREATE TEMP TABLE result_data_temp (
    snapshot_date DATE,
    portfolio_value NUMERIC,
    vni_value NUMERIC
  );

  -- Always add the first point
  INSERT INTO result_data_temp SELECT rd.snapshot_date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    -- Calculate average for the next bucket
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    IF range_end > data_count THEN range_end := data_count;
    END IF;
    
    IF range_start > range_end THEN CONTINUE;
    END IF;

    SELECT AVG(EXTRACT(EPOCH FROM rd.snapshot_date)) INTO avg_x
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    SELECT AVG(rd.portfolio_value) INTO avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    -- Find the point with the largest triangle area based on portfolio_value
    max_area := -1;

    SELECT * INTO result_data
    FROM result_data_temp
    ORDER BY snapshot_date
    DESC LIMIT 1;

    FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - avg_x) * (data.portfolio_value - result_data.portfolio_value) -
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - EXTRACT(EPOCH FROM data.snapshot_date)) * (avg_y - result_data.portfolio_value)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    -- Add the selected point to the results
    INSERT INTO result_data_temp (snapshot_date, portfolio_value, vni_value)
    VALUES (point_to_add.snapshot_date, point_to_add.portfolio_value, point_to_add.vni_value);
    a := a + 1;
  END LOOP;

  -- Always add the last point
  INSERT INTO result_data_temp SELECT rd.snapshot_date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = data_count;

  RETURN QUERY SELECT r.snapshot_date, r.portfolio_value, r.vni_value FROM result_data_temp r ORDER BY r.snapshot_date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;


ALTER FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("snapshot_date" "date", "net_equity" numeric, "cumulative_cashflow" numeric)
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
  -- Create temp table with both equity and cumulative_cashflow
  CREATE TEMP TABLE raw_data AS
  SELECT
    dps.snapshot_date,
    dps.net_equity::numeric AS net_equity,
    dps.cumulative_cashflow::numeric AS cumulative_cashflow,
    ROW_NUMBER() OVER (ORDER BY dps.snapshot_date) AS rn
  FROM public.daily_snapshots dps
  WHERE dps.snapshot_date >= p_start_date AND dps.snapshot_date <= p_end_date
  ORDER BY dps.snapshot_date;

  SELECT COUNT(*) INTO data_count FROM raw_data;

  -- If data below threshold, return all
  IF data_count <= p_threshold THEN
    RETURN QUERY
    SELECT rd.snapshot_date, rd.net_equity, rd.cumulative_cashflow
    FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;

  -- Temporary result table
  CREATE TEMP TABLE result_data_temp (
    snapshot_date DATE,
    net_equity NUMERIC,
    cumulative_cashflow NUMERIC
  );

  -- Always add first point
  INSERT INTO result_data_temp
  SELECT rd.snapshot_date, rd.net_equity, rd.cumulative_cashflow
  FROM raw_data rd
  WHERE rn = 1;

  every := (data_count - 2.0) / (p_threshold - 2.0);

  FOR i IN 0..p_threshold - 3 LOOP
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;

    -- Compute average for the next bucket
    SELECT
      AVG(EXTRACT(EPOCH FROM rd.snapshot_date)),
      AVG(rd.net_equity)
    INTO avg_x, avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;

    max_area := -1;
    SELECT * INTO result_data FROM result_data_temp ORDER BY snapshot_date DESC LIMIT 1;

    FOR data IN
      SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end
    LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - avg_x) * (data.net_equity - result_data.net_equity) -
        (EXTRACT(EPOCH FROM result_data.snapshot_date) - EXTRACT(EPOCH FROM data.snapshot_date)) * (avg_y - result_data.net_equity)
      ) * 0.5;

      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;

    INSERT INTO result_data_temp (snapshot_date, net_equity, cumulative_cashflow)
    VALUES (point_to_add.snapshot_date, point_to_add.net_equity, point_to_add.cumulative_cashflow);

    a := a + 1;
  END LOOP;

  -- Always add last point
  INSERT INTO result_data_temp
  SELECT rd.snapshot_date, rd.net_equity, rd.cumulative_cashflow
  FROM raw_data rd
  WHERE rn = data_count;

  -- Return the final sampled points
  RETURN QUERY
  SELECT * FROM result_data_temp ORDER BY snapshot_date;

  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;


ALTER FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."daily_exchange_rates" (
    "currency_code" "text" NOT NULL,
    "date" "date" NOT NULL,
    "rate" numeric(14,2) NOT NULL
);


ALTER TABLE "public"."daily_exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_security_prices" (
    "asset_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);


ALTER TABLE "public"."daily_security_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tx_debt" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation" "text" NOT NULL,
    "principal" numeric(16,0) NOT NULL,
    "interest" numeric(16,0) NOT NULL,
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
    "net_proceed" numeric(16,0) NOT NULL
);


ALTER TABLE "public"."tx_legs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."balance_sheet" WITH ("security_invoker"='on') AS
 WITH "asset_quantities" AS (
         SELECT "a"."id" AS "asset_id",
            "a"."ticker",
                CASE
                    WHEN ("a"."ticker" = 'INTERESTS'::"text") THEN COALESCE(( SELECT "sum"(("d"."principal" * ("power"(((1)::numeric + (("d"."rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "e"."created_at"))) - (1)::numeric))) AS "sum"
                       FROM ("public"."tx_debt" "d"
                         JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
                      WHERE (("d"."operation" = 'borrow'::"text") AND (NOT ("d"."tx_id" IN ( SELECT DISTINCT "tx_debt"."repay_tx"
                               FROM "public"."tx_debt"
                              WHERE ("tx_debt"."repay_tx" IS NOT NULL)))))), (0)::numeric)
                    ELSE COALESCE("sum"("tl"."quantity"), (0)::numeric)
                END AS "quantity"
           FROM ("public"."assets" "a"
             LEFT JOIN "public"."tx_legs" "tl" ON (("tl"."asset_id" = "a"."id")))
          GROUP BY "a"."id", "a"."ticker"
        ), "asset_cb" AS (
         SELECT "a"."asset_class",
            "sum"("tl"."net_proceed") AS "total"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE ("a"."asset_class" <> ALL (ARRAY['equity'::"public"."asset_class", 'liability'::"public"."asset_class"]))
          GROUP BY "a"."asset_class"
        ), "asset_mv" AS (
         SELECT "a"."asset_class",
            "sum"((("aq"."quantity" * COALESCE("sp"."price", (1)::numeric)) * COALESCE("er"."rate", (1)::numeric))) AS "total"
           FROM ((("public"."assets" "a"
             JOIN "asset_quantities" "aq" ON (("aq"."asset_id" = "a"."id")))
             LEFT JOIN LATERAL ( SELECT "daily_security_prices"."price"
                   FROM "public"."daily_security_prices"
                  WHERE ("daily_security_prices"."asset_id" = "a"."id")
                  ORDER BY "daily_security_prices"."date" DESC
                 LIMIT 1) "sp" ON (true))
             LEFT JOIN LATERAL ( SELECT "daily_exchange_rates"."rate"
                   FROM "public"."daily_exchange_rates"
                  WHERE ("daily_exchange_rates"."currency_code" = "a"."currency_code")
                  ORDER BY "daily_exchange_rates"."date" DESC
                 LIMIT 1) "er" ON (true))
          WHERE ("a"."asset_class" <> ALL (ARRAY['equity'::"public"."asset_class", 'liability'::"public"."asset_class"]))
          GROUP BY "a"."asset_class"
        ), "totals" AS (
         SELECT COALESCE("sum"(
                CASE
                    WHEN ("amv"."asset_class" = 'cash'::"public"."asset_class") THEN "amv"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "cash_mv_raw",
            COALESCE("sum"(
                CASE
                    WHEN ("amv"."asset_class" = 'stock'::"public"."asset_class") THEN "amv"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "stock_mv",
            COALESCE("sum"(
                CASE
                    WHEN ("amv"."asset_class" = 'fund'::"public"."asset_class") THEN "amv"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "fund_mv",
            COALESCE("sum"(
                CASE
                    WHEN ("amv"."asset_class" = 'crypto'::"public"."asset_class") THEN "amv"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "crypto_mv",
            COALESCE("sum"(
                CASE
                    WHEN ("acb"."asset_class" = 'cash'::"public"."asset_class") THEN "acb"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "cash_cb",
            COALESCE("sum"(
                CASE
                    WHEN ("acb"."asset_class" = 'stock'::"public"."asset_class") THEN "acb"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "stock_cb",
            COALESCE("sum"(
                CASE
                    WHEN ("acb"."asset_class" = 'fund'::"public"."asset_class") THEN "acb"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "fund_cb",
            COALESCE("sum"(
                CASE
                    WHEN ("acb"."asset_class" = 'crypto'::"public"."asset_class") THEN "acb"."total"
                    ELSE NULL::numeric
                END), (0)::numeric) AS "crypto_cb"
           FROM ("asset_mv" "amv"
             FULL JOIN "asset_cb" "acb" ON (("amv"."asset_class" = "acb"."asset_class")))
        ), "assets_fixed" AS (
         SELECT GREATEST("totals"."cash_mv_raw", (0)::numeric) AS "cash_mv",
            "totals"."stock_mv",
            "totals"."fund_mv",
            "totals"."crypto_mv",
            "totals"."cash_cb",
            "totals"."stock_cb",
            "totals"."fund_cb",
            "totals"."crypto_cb",
            "totals"."cash_mv_raw"
           FROM "totals"
        ), "liabilities_base" AS (
         SELECT "sum"(("d"."principal" * ("power"(((1)::numeric + (("d"."rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "e"."created_at"))) - (1)::numeric))) AS "accrued_interest"
           FROM ("public"."tx_debt" "d"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
          WHERE (("d"."operation" = 'borrow'::"text") AND (NOT ("d"."tx_id" IN ( SELECT DISTINCT "tx_debt"."repay_tx"
                   FROM "public"."tx_debt"
                  WHERE ("tx_debt"."repay_tx" IS NOT NULL)))))
        ), "liabilities" AS (
         SELECT ((0)::numeric - LEAST("t"."cash_mv_raw", (0)::numeric)) AS "margin",
            ( SELECT ("aq"."quantity" * ('-1'::integer)::numeric)
                   FROM ("asset_quantities" "aq"
                     JOIN "public"."assets" "a" ON (("a"."id" = "aq"."asset_id")))
                  WHERE ("a"."ticker" = 'DEBTS'::"text")) AS "debts_principal",
            "lb"."accrued_interest"
           FROM "liabilities_base" "lb",
            "totals" "t"
        ), "equity" AS (
         SELECT ( SELECT ("aq"."quantity" * ('-1'::integer)::numeric)
                   FROM ("asset_quantities" "aq"
                     JOIN "public"."assets" "a" ON (("a"."id" = "aq"."asset_id")))
                  WHERE ("a"."ticker" = 'CAPITAL'::"text")) AS "owner_capital",
            ((((("t"."cash_mv_raw" + "t"."stock_mv") + "t"."fund_mv") + "t"."crypto_mv") - ((("t"."cash_cb" + "t"."stock_cb") + "t"."fund_cb") + "t"."crypto_cb")) - "l"."accrued_interest") AS "unrealized_pl"
           FROM "totals" "t",
            "liabilities" "l"
        )
 SELECT 'Cash'::"text" AS "account",
    'asset'::"text" AS "type",
    ("round"("a"."cash_mv"))::numeric(20,0) AS "amount"
   FROM "assets_fixed" "a"
UNION ALL
 SELECT 'Stock'::"text" AS "account",
    'asset'::"text" AS "type",
    ("round"("a"."stock_mv"))::numeric(20,0) AS "amount"
   FROM "assets_fixed" "a"
UNION ALL
 SELECT 'Fund'::"text" AS "account",
    'asset'::"text" AS "type",
    ("round"("a"."fund_mv"))::numeric(20,0) AS "amount"
   FROM "assets_fixed" "a"
UNION ALL
 SELECT 'Crypto'::"text" AS "account",
    'asset'::"text" AS "type",
    ("round"("a"."crypto_mv"))::numeric(20,0) AS "amount"
   FROM "assets_fixed" "a"
UNION ALL
 SELECT 'Margin'::"text" AS "account",
    'liability'::"text" AS "type",
    ("round"("l"."margin"))::numeric(20,0) AS "amount"
   FROM "liabilities" "l"
UNION ALL
 SELECT 'Debts Principal'::"text" AS "account",
    'liability'::"text" AS "type",
    ("round"("l"."debts_principal"))::numeric(20,0) AS "amount"
   FROM "liabilities" "l"
UNION ALL
 SELECT 'Accrued Interest'::"text" AS "account",
    'liability'::"text" AS "type",
    ("round"("l"."accrued_interest"))::numeric(20,0) AS "amount"
   FROM "liabilities" "l"
UNION ALL
 SELECT 'Owner Capital'::"text" AS "account",
    'equity'::"text" AS "type",
    ("round"("e"."owner_capital"))::numeric(20,0) AS "amount"
   FROM "equity" "e"
UNION ALL
 SELECT 'Unrealized P/L'::"text" AS "account",
    'equity'::"text" AS "type",
    ("round"("e"."unrealized_pl"))::numeric(20,0) AS "amount"
   FROM "equity" "e";


ALTER VIEW "public"."balance_sheet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(20,8) NOT NULL,
    "amount" numeric(16,4) NOT NULL,
    "currency_code" "text" NOT NULL
);


ALTER TABLE "public"."transaction_legs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."crypto_holdings" WITH ("security_invoker"='on') AS
 WITH "latest_price" AS (
         SELECT DISTINCT ON ("dsp"."asset_id") "dsp"."asset_id",
            "dsp"."price"
           FROM "public"."daily_security_prices" "dsp"
          ORDER BY "dsp"."asset_id", "dsp"."date" DESC
        ), "latest_fx" AS (
         SELECT DISTINCT ON ("der"."currency_code") "der"."currency_code",
            "der"."rate" AS "fx_rate"
           FROM "public"."daily_exchange_rates" "der"
          ORDER BY "der"."currency_code", "der"."date" DESC
        ), "latest_data" AS (
         SELECT "a_1"."id" AS "asset_id",
            COALESCE("lp"."price", (1)::numeric) AS "price",
            COALESCE("lf"."fx_rate", (1)::numeric) AS "fx_rate"
           FROM (("public"."assets" "a_1"
             LEFT JOIN "latest_price" "lp" ON (("lp"."asset_id" = "a_1"."id")))
             LEFT JOIN "latest_fx" "lf" ON (("lf"."currency_code" = "a_1"."currency_code")))
          WHERE ("a_1"."asset_class" = 'crypto'::"public"."asset_class")
        )
 SELECT "a"."ticker",
    "a"."name",
    "a"."logo_url",
    "a"."currency_code",
    "sum"("tl"."quantity") AS "quantity",
    "sum"("tl"."amount") AS "cost_basis",
    "ld"."price",
    "ld"."fx_rate",
    (("sum"("tl"."quantity") * "ld"."price") * "ld"."fx_rate") AS "market_value"
   FROM (("public"."assets" "a"
     JOIN "public"."transaction_legs" "tl" ON (("a"."id" = "tl"."asset_id")))
     JOIN "latest_data" "ld" ON (("ld"."asset_id" = "a"."id")))
  WHERE ("a"."asset_class" = 'crypto'::"public"."asset_class")
  GROUP BY "a"."id", "a"."ticker", "a"."name", "a"."logo_url", "a"."currency_code", "ld"."price", "ld"."fx_rate"
 HAVING ("sum"("tl"."quantity") > (0)::numeric);


ALTER VIEW "public"."crypto_holdings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."daily_snapshots" (
    "snapshot_date" "date" NOT NULL,
    "total_assets" numeric(16,0) DEFAULT 0 NOT NULL,
    "total_liabilities" numeric(16,0) DEFAULT 0 NOT NULL,
    "net_equity" numeric(16,0) DEFAULT 0 NOT NULL,
    "net_cashflow" numeric(16,0) DEFAULT 0 NOT NULL,
    "cumulative_cashflow" numeric(16,0) DEFAULT 0 NOT NULL,
    "equity_index" numeric(10,2) DEFAULT 100 NOT NULL
);


ALTER TABLE "public"."daily_snapshots" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tx_cashflow" (
    "tx_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "quantity" numeric(18,2) NOT NULL,
    "fx_rate" numeric DEFAULT 1 NOT NULL,
    "net_proceed" numeric(16,0) GENERATED ALWAYS AS (("quantity" * "fx_rate")) STORED NOT NULL
);


ALTER TABLE "public"."tx_cashflow" OWNER TO "postgres";


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
         SELECT "d"."lender",
            "d"."principal",
            "d"."rate",
            "e"."created_at" AS "borrow_date"
           FROM ("public"."tx_debt" "d"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
          WHERE (("d"."operation" = 'borrow'::"text") AND (NOT ("d"."tx_id" IN ( SELECT DISTINCT "tx_debt"."repay_tx"
                   FROM "public"."tx_debt"
                  WHERE ("tx_debt"."repay_tx" IS NOT NULL)))))
        )
 SELECT "lender",
    "principal",
    "rate",
    "borrow_date",
    EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "borrow_date")) AS "duration",
    "round"((("principal" * "power"(((1)::numeric + (("rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "borrow_date")))) - "principal"), 2) AS "interest"
   FROM "borrow_tx" "b"
  ORDER BY "borrow_date";


ALTER VIEW "public"."outstanding_debts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_annual_pnl" WITH ("security_invoker"='on') AS
 WITH "capital_legs" AS (
         SELECT "tl"."tx_id",
            "tl"."net_proceed" AS "capital_amount",
            "t"."created_at"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."tx_entries" "t" ON (("t"."id" = "tl"."tx_id")))
          WHERE ("tl"."asset_id" = 'e39728be-0a37-4608-b30d-dabd1a4017ab'::"uuid")
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
    (- "sum"("c"."capital_amount")) AS "total_pnl"
   FROM (("capital_legs" "c"
     JOIN "stock_legs" "s" ON (("s"."tx_id" = "c"."tx_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "s"."stock_id")))
  GROUP BY "a"."logo_url", "a"."name", "a"."ticker", (EXTRACT(year FROM "c"."created_at"));


ALTER VIEW "public"."stock_annual_pnl" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_holdings" WITH ("security_invoker"='on') AS
 WITH "latest_data" AS (
         SELECT DISTINCT ON ("dsp"."asset_id") "dsp"."asset_id",
            "dsp"."price"
           FROM "public"."daily_security_prices" "dsp"
          ORDER BY "dsp"."asset_id", "dsp"."date" DESC
        )
 SELECT "a"."ticker",
    "a"."name",
    "a"."logo_url",
    "sum"("tl"."quantity") AS "quantity",
    "sum"("tl"."net_proceed") AS "cost_basis",
    COALESCE("ld"."price", (1)::numeric) AS "price",
    ("sum"("tl"."quantity") * COALESCE("ld"."price", (1)::numeric)) AS "market_value"
   FROM (("public"."assets" "a"
     JOIN "public"."tx_legs" "tl" ON (("a"."id" = "tl"."asset_id")))
     LEFT JOIN "latest_data" "ld" ON (("ld"."asset_id" = "a"."id")))
  WHERE ("a"."asset_class" = 'stock'::"public"."asset_class")
  GROUP BY "a"."id", "a"."ticker", "a"."name", "a"."logo_url", "ld"."price"
 HAVING ("sum"("tl"."quantity") > (0)::numeric);


ALTER VIEW "public"."stock_holdings" OWNER TO "postgres";


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


CREATE OR REPLACE VIEW "public"."yearly_snapshots" WITH ("security_invoker"='on') AS
 WITH "annual_cashflow" AS (
         SELECT (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))::integer AS "year",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" > (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" < (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_snapshots"
          GROUP BY (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))
        ), "equity_data" AS (
         SELECT EXTRACT(year FROM "daily_snapshots"."snapshot_date") AS "yr",
            "daily_snapshots"."snapshot_date" AS "dps_date",
            "daily_snapshots"."equity_index"
           FROM "public"."daily_snapshots"
          WHERE ("daily_snapshots"."equity_index" IS NOT NULL)
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
                    WHEN ("daily_snapshots"."net_cashflow" > (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" < (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_snapshots"
        ), "scalar_values" AS (
         SELECT ( SELECT "daily_snapshots"."equity_index"
                   FROM "public"."daily_snapshots"
                  ORDER BY "daily_snapshots"."snapshot_date"
                 LIMIT 1) AS "first_equity",
            ( SELECT "daily_snapshots"."equity_index"
                   FROM "public"."daily_snapshots"
                  ORDER BY "daily_snapshots"."snapshot_date" DESC
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



ALTER TABLE ONLY "public"."daily_snapshots"
    ADD CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("snapshot_date");



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



ALTER TABLE ONLY "public"."asset_positions"
    ADD CONSTRAINT "stock_positions_pkey" PRIMARY KEY ("asset_id");



ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "debts_currency_code_idx" ON "public"."debts" USING "btree" ("currency_code");



CREATE INDEX "lot_consumptions_tax_lot_id_idx" ON "public"."lot_consumptions" USING "btree" ("tax_lot_id");



CREATE INDEX "tax_lots_asset_id_idx" ON "public"."tax_lots" USING "btree" ("asset_id");



CREATE INDEX "tax_lots_creation_transaction_id_idx" ON "public"."tax_lots" USING "btree" ("creation_transaction_id");



CREATE INDEX "transaction_legs_asset_id_idx" ON "public"."transaction_legs" USING "btree" ("asset_id");



CREATE INDEX "transaction_legs_currency_code_idx" ON "public"."transaction_legs" USING "btree" ("currency_code");



CREATE INDEX "transaction_legs_transaction_id_idx" ON "public"."transaction_legs" USING "btree" ("transaction_id");



CREATE OR REPLACE TRIGGER "trg_process_tx_cashflow" AFTER INSERT ON "public"."tx_cashflow" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_cashflow_func"();



CREATE OR REPLACE TRIGGER "trg_process_tx_debt" AFTER INSERT ON "public"."tx_debt" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_debt_func"();



CREATE OR REPLACE TRIGGER "trg_process_tx_stock" AFTER INSERT ON "public"."tx_stock" FOR EACH ROW EXECUTE FUNCTION "public"."trg_process_tx_stock_func"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_cashflow_update" AFTER UPDATE ON "public"."tx_cashflow" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_debt_update" AFTER UPDATE ON "public"."tx_debt" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



CREATE OR REPLACE TRIGGER "trg_rebuild_on_stock_update" AFTER UPDATE ON "public"."tx_stock" FOR EACH STATEMENT EXECUTE FUNCTION "public"."rebuild_on_child_update"();



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



ALTER TABLE ONLY "public"."asset_positions"
    ADD CONSTRAINT "stock_positions_stock_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



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



CREATE POLICY "Access for authenticated users" ON "public"."daily_snapshots" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_cashflow" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_debt" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_entries" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_legs" TO "authenticated" USING (true);



CREATE POLICY "Access for authenticated users" ON "public"."tx_stock" TO "authenticated" USING (true);



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



ALTER TABLE "public"."asset_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_market_indices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_performance_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_security_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dnse_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_consumptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_lots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_legs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("txn_id" "uuid", "include_expenses" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_dnse_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_daily_snapshots"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_daily_snapshots"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_daily_snapshots"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_on_child_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) TO "service_role";



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



GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."daily_security_prices" TO "anon";
GRANT ALL ON TABLE "public"."daily_security_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_security_prices" TO "service_role";



GRANT ALL ON TABLE "public"."tx_debt" TO "anon";
GRANT ALL ON TABLE "public"."tx_debt" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_debt" TO "service_role";



GRANT ALL ON TABLE "public"."tx_entries" TO "anon";
GRANT ALL ON TABLE "public"."tx_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tx_legs" TO "anon";
GRANT ALL ON TABLE "public"."tx_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_legs" TO "service_role";



GRANT ALL ON TABLE "public"."balance_sheet" TO "anon";
GRANT ALL ON TABLE "public"."balance_sheet" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_sheet" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_legs" TO "anon";
GRANT ALL ON TABLE "public"."transaction_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_legs" TO "service_role";



GRANT ALL ON TABLE "public"."crypto_holdings" TO "anon";
GRANT ALL ON TABLE "public"."crypto_holdings" TO "authenticated";
GRANT ALL ON TABLE "public"."crypto_holdings" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."daily_market_indices" TO "anon";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_market_indices" TO "service_role";



GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_performance_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."daily_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."dnse_orders" TO "anon";
GRANT ALL ON TABLE "public"."dnse_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_orders" TO "service_role";



GRANT ALL ON TABLE "public"."lot_consumptions" TO "anon";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_consumptions" TO "service_role";



GRANT ALL ON TABLE "public"."tx_cashflow" TO "anon";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_cashflow" TO "service_role";



GRANT ALL ON TABLE "public"."tx_stock" TO "anon";
GRANT ALL ON TABLE "public"."tx_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."tx_stock" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."outstanding_debts" TO "anon";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "authenticated";
GRANT ALL ON TABLE "public"."outstanding_debts" TO "service_role";



GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "anon";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_annual_pnl" TO "service_role";



GRANT ALL ON TABLE "public"."stock_holdings" TO "anon";
GRANT ALL ON TABLE "public"."stock_holdings" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_holdings" TO "service_role";



GRANT ALL ON TABLE "public"."tax_lots" TO "anon";
GRANT ALL ON TABLE "public"."tax_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_lots" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



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

