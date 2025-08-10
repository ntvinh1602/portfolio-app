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