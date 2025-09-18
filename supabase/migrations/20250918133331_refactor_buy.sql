CREATE OR REPLACE FUNCTION public.process_dnse_orders() 
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
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

drop function if exists "public"."add_expense_transaction"("date", numeric, "text", "uuid", timestamp with time zone);

CREATE OR REPLACE FUNCTION public.add_expense_transaction(
  p_transaction_date date,
  p_quantity numeric,
  p_description text,
  p_asset_id uuid,
  p_created_at timestamptz DEFAULT now(),
  p_linked_txn uuid DEFAULT NULL
) 
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
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

