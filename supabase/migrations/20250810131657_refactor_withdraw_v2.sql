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