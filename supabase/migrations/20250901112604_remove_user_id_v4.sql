drop function if exists public.add_borrow_transaction("uuid", "text", numeric, numeric, "date", "uuid", "text", timestamp with time zone);

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
  
  -- 2. Create the debt record
  INSERT INTO public.debts (lender_name, principal_amount, currency_code, interest_rate, start_date, is_active)
  VALUES (
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    p_transaction_date,
    true
  ) RETURNING id INTO v_debt_id;

  -- 3. Create the transaction
  INSERT INTO public.transactions (transaction_date, type, description, related_debt_id, created_at)
  VALUES (
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

drop function if exists "public"."add_buy_transaction"("uuid", "date", "uuid", "uuid", numeric, numeric, "text", timestamp with time zone);

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
  v_cash_asset_currency := public.get_asset_currency(p_asset_id);
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

drop function if exists "public"."add_debt_payment_transaction"("uuid", "uuid", numeric, numeric, "date", "uuid", "text", timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."add_debt_payment_transaction"("p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_total_payment := p_principal_payment + p_interest_payment;

  -- 3. Create a new transactions record
  INSERT INTO public.transactions (transaction_date, type, description, related_debt_id, created_at)
  VALUES (
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

drop function if exists "public"."add_deposit_transaction"("uuid", "date", numeric, "text", "uuid", timestamp with time zone);

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

drop function if exists "public"."add_expense_transaction"("uuid", "date", numeric, "text", "uuid", timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."add_expense_transaction"("p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_cash_asset_currency := public.get_asset_currency(p_asset_id);

  -- 2. Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

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
  INSERT INTO public.transactions (transaction_date, type, description, created_at)
  VALUES (
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
      WHERE asset_id = p_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_spend <= 0 THEN EXIT;
      END IF;
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

drop function if exists "public"."add_income_transaction"("uuid", "date", numeric, "text", "uuid", "text", timestamp with time zone);

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

drop function if exists "public"."add_sell_transaction"("uuid", "uuid", numeric, numeric, "date", "uuid", "text", timestamp with time zone);

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

drop function if exists "public"."add_split_transaction"("uuid", "uuid", numeric, "date", "text", timestamp with time zone);

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

drop function if exists "public"."add_withdraw_transaction"("uuid", "date", numeric, "text", "uuid", timestamp with time zone);

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

drop function if exists "public"."import_transactions"("uuid", "jsonb", "date");

CREATE OR REPLACE FUNCTION "public"."import_transactions"("p_transactions_data" "jsonb", "p_start_date" "date") RETURNS "void"
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
      v_asset_id := public.get_asset_id_from_ticker(v_asset_ticker);
    END IF;

    v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
    IF v_cash_asset_ticker IS NOT NULL THEN
      v_cash_asset_id := public.get_asset_id_from_ticker(v_cash_asset_ticker);
    END IF;

    CASE v_transaction_type
      WHEN 'buy' THEN PERFORM "public"."add_buy_transaction"(
        (v_transaction_record->>'date')::date,
        v_asset_id,
        v_cash_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'sell' THEN PERFORM "public"."add_sell_transaction"(
        v_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'deposit' THEN PERFORM "public"."add_deposit_transaction"(
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'withdraw' THEN PERFORM "public"."add_withdraw_transaction"(
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
        WHERE lender_name = v_lender_name AND is_active;
        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
        END IF;
        PERFORM "public"."add_debt_payment_transaction"(
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
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        ELSE
          PERFORM "public"."add_income_transaction"(
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_cash_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        END IF;
      WHEN 'expense' THEN PERFORM "public"."add_expense_transaction"(
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'borrow' THEN PERFORM "public"."add_borrow_transaction"(
        v_transaction_record->>'counterparty',
        (v_transaction_record->>'principal')::numeric,
        (v_transaction_record->>'interest_rate')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'split' THEN PERFORM "public"."add_split_transaction"(
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
  PERFORM public.generate_performance_snapshots(p_start_date, CURRENT_DATE);
END;
$$;