drop function if exists "public"."handle_expense_transaction"("uuid", "date", "uuid", numeric, "text", "uuid", timestamp with time zone);

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