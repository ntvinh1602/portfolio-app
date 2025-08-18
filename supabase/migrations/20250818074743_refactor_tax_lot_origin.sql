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

alter table public.tax_lots
drop column if exists origin;

DROP TYPE if exists tax_lot_origin;
