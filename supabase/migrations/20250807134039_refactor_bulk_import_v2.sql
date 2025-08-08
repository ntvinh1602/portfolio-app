CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") RETURNS "void"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_transaction_record jsonb;
  v_transaction_type text;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_account_id uuid;
  v_debt_id uuid;
  v_asset_ticker text;
  v_cash_asset_ticker text;
  v_account_name text;
  v_lender_name text;
  v_security_id uuid;
BEGIN
  IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of transactions.';
  END IF;

  FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
  LOOP
    v_transaction_type := v_transaction_record->>'type';
    v_asset_ticker := v_transaction_record->>'asset_ticker';
    v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
    v_account_name := v_transaction_record->>'account';
    IF v_asset_ticker IS NOT NULL THEN
      SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_asset_ticker;
      IF v_security_id IS NULL THEN
        RAISE EXCEPTION 'Security with ticker % not found.', v_asset_ticker;
      END IF;
      SELECT id INTO v_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
      IF v_asset_id IS NULL THEN
        RAISE EXCEPTION 'Asset for ticker % not found for user.', v_asset_ticker;
      END IF;
    END IF;
    IF v_cash_asset_ticker IS NOT NULL THEN
      SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_cash_asset_ticker;
      IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_cash_asset_ticker; END IF;
      SELECT id INTO v_cash_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
      IF v_cash_asset_id IS NULL THEN
        RAISE EXCEPTION 'Asset for ticker % not found for user.', v_cash_asset_ticker; 
      END IF;
    END IF;
    IF v_account_name IS NOT NULL THEN
      SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
      IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Account with name % not found.', v_account_name;
      END IF;
    END IF;
    CASE v_transaction_type
      WHEN 'buy' THEN
        PERFORM "public"."handle_buy_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          v_account_id,
          v_asset_id,
          v_cash_asset_id,
          (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric,v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'sell' THEN
        PERFORM "public"."handle_sell_transaction"(
          p_user_id,
          v_asset_id,
          (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric,
          (v_transaction_record->>'date')::date,
          v_account_id,
          v_cash_asset_id,
          v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'deposit' THEN
        PERFORM "public"."handle_deposit_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          v_account_id,
          (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
          v_asset_id,
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'withdraw' THEN
        PERFORM "public"."handle_withdraw_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          v_account_id,
          (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
          v_asset_id,
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'debt_payment' THEN
        v_lender_name := v_transaction_record->>'counterparty';
        SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
        IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
        PERFORM "public"."handle_debt_payment_transaction"(
          p_user_id,
          v_debt_id,
          (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest')::numeric,
          (v_transaction_record->>'date')::date,
          v_account_id,
          v_cash_asset_id,
          v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'income' THEN
        PERFORM "public"."handle_income_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          v_account_id,
          (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
          v_cash_asset_id,
          'income',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'dividend' THEN
        IF v_asset_ticker = 'EPF' THEN
          PERFORM "public"."handle_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            v_account_id,
            (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
            v_asset_id,
            'dividend',
          (v_transaction_record->>'created_at')::timestamptz
          );
        ELSE
          PERFORM "public"."handle_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            v_account_id,
            (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
            v_cash_asset_id,
            'dividend',
          (v_transaction_record->>'created_at')::timestamptz
          );
        END IF;
      WHEN 'expense' THEN
        PERFORM "public"."handle_expense_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          v_account_id,
          (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description',
          v_asset_id,
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'borrow' THEN
        PERFORM "public"."handle_borrow_transaction"(
          p_user_id,
          v_transaction_record->>'counterparty',
          (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest_rate')::numeric, (v_transaction_record->>'date')::date,
          v_account_id,
          v_cash_asset_id,
          v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'split' THEN
        PERFORM "public"."handle_split_transaction"(
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
END;
$$;

drop function if exists "public"."handle_buy_transaction"("uuid", "date", "uuid", "uuid", "uuid", numeric, numeric, "text");

CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text", "p_created_at" timestamptz default now()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id uuid;
    v_cost_of_purchase_native_currency numeric;
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
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_equity_account_id UUID;
    v_retained_earnings_security_id UUID;
BEGIN
    -- 1. Get currency codes for purchased asset and cash asset
    SELECT s.currency_code INTO v_purchased_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id;
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;

    -- 2. Calculate the total cost of the transaction in the native currency
    v_cost_of_purchase_native_currency := p_quantity * p_price;

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
        v_cost_basis_purchased_asset_vnd := v_cost_of_purchase_native_currency * v_exchange_rate;
        -- Consume tax lots of the cash asset
        v_remaining_quantity_to_spend := v_cost_of_purchase_native_currency;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
        FOR v_lot IN
            SELECT * FROM tax_lots
            WHERE user_id = p_user_id AND asset_id = p_cash_asset_id AND remaining_quantity > 0
            ORDER BY creation_date ASC
        LOOP
            IF v_remaining_quantity_to_spend <= 0 THEN EXIT; END IF;
            v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
            v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
            UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
            INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
            v_cost_basis_cash_spent_vnd := v_cost_basis_cash_spent_vnd + v_cost_basis_from_lot;
            v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
        END LOOP;
        IF v_remaining_quantity_to_spend > 0 THEN
            RAISE EXCEPTION 'Not enough cash for purchase. Tried to spend %, but only % was available.', v_cost_of_purchase_native_currency, (v_cost_of_purchase_native_currency - v_remaining_quantity_to_spend);
        END IF;
        -- Get Retained Earnings asset and Equity account
        SELECT id INTO v_retained_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_retained_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
        IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.'; END IF;
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description, price, created_at)
        VALUES (p_user_id, p_transaction_date, 'buy', p_description, p_price, p_created_at)
        RETURNING id INTO v_transaction_id;
        -- Calculate realized gain/loss
        v_realized_gain_loss_vnd := v_cost_basis_purchased_asset_vnd - v_cost_basis_cash_spent_vnd;
        -- Create transaction legs
        -- Credit the cash asset at its cost basis
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_of_purchase_native_currency * -1, v_cost_basis_cash_spent_vnd * -1, v_cash_asset_currency_code)
        RETURNING id INTO v_cash_asset_leg_id;
        
        -- Debit the purchased asset
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis_purchased_asset_vnd, v_purchased_asset_currency_code);
        -- Credit/Debit Retained Earnings with the realized FX gain/loss
        IF v_realized_gain_loss_vnd != 0 THEN
             INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
             VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss_vnd * -1, v_realized_gain_loss_vnd * -1, v_retained_earnings_currency_code);
        END IF;
        -- Create lot consumptions
        FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
            INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
            VALUES (v_cash_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
        END LOOP;
    ELSE -- Standard buy logic for VND
        v_cost_basis_purchased_asset_vnd := v_cost_of_purchase_native_currency;
        INSERT INTO transactions (user_id, transaction_date, type, description, price, created_at) VALUES (p_user_id, p_transaction_date, 'buy', p_description, p_price, p_created_at) RETURNING id INTO v_transaction_id;
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
            (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_of_purchase_native_currency * -1, v_cost_basis_purchased_asset_vnd * -1, v_cash_asset_currency_code),
            (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis_purchased_asset_vnd, v_purchased_asset_currency_code);
    END IF;

    -- 4. Create tax lot for the purchased asset
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis_purchased_asset_vnd);

    RETURN v_transaction_id;
END;
$$;