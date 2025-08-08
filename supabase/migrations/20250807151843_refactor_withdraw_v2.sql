CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamptz default now()) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance numeric;
    v_draw_from_earnings numeric;
    v_draw_from_capital numeric;
    v_capital_balance numeric;
    v_response JSONB;
    v_earnings_security_id UUID;
    v_capital_security_id UUID;
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
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
BEGIN
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified cash asset.');
    END IF;
    -- Calculate the amount
    IF v_cash_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find exchange rate for ' || v_cash_asset_currency_code || ' on or before ' || p_transaction_date);
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get Equity conceptual account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;
    -- FX Gain/Loss logic for non-VND cash withdrawal
    IF v_cash_asset_currency_code != 'VND' THEN
        v_remaining_quantity_to_withdraw := p_quantity;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
        -- Get Retained Earnings asset
        SELECT id INTO v_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        -- Get Capital asset
        SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
        SELECT a.id, s.currency_code INTO v_capital_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
        IF v_capital_asset.id IS NULL THEN RAISE EXCEPTION 'Could not find ''Paid-in Capital'' asset for user.'; END IF;
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
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description, created_at)
        VALUES (p_user_id, p_transaction_date, 'withdraw', p_description, p_created_at)
        RETURNING id INTO v_transaction_id;
        v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
        -- Create balanced transaction legs
        -- Debit Capital (Owner's Draw) for the full current value
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_calculated_amount, v_calculated_amount, v_capital_asset.currency_code);
        -- Credit the cash asset at its cost basis
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_total_cost_basis * -1, v_cash_asset_currency_code)
        RETURNING id INTO v_asset_leg_id;
        -- Credit Retained Earnings with the realized FX gain/loss
        IF v_realized_gain_loss != 0 THEN
             INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
             VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);
        END IF;
        -- Create lot consumptions
        FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
            INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
            VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
        END LOOP;
        v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
        RETURN v_response;
    ELSE -- Standard withdrawal logic for VND
        SELECT id INTO v_earnings_security_id FROM public.securities WHERE ticker = 'EARNINGS';
        SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
        IF v_earnings_security_id IS NULL OR v_capital_security_id IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' securities.');
        END IF;
        SELECT a.id, s.currency_code INTO v_earnings_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_earnings_security_id AND a.user_id = p_user_id;
        SELECT a.id, s.currency_code INTO v_capital_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
        IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets for user.');
        END IF;
        v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
        IF v_earnings_balance < 0 THEN
            v_draw_from_earnings := LEAST(v_calculated_amount, ABS(v_earnings_balance));
        ELSE
            v_draw_from_earnings := 0;
        END IF;
        v_draw_from_capital := v_calculated_amount - v_draw_from_earnings;
        IF v_draw_from_capital > 0 THEN
            v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
            IF v_draw_from_capital > ABS(v_capital_balance) THEN
                RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.');
            END IF;
        END IF;
        INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
        VALUES (p_user_id, p_transaction_date, 'withdraw', p_description, p_created_at)
        RETURNING id INTO v_transaction_id;
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_calculated_amount * -1, v_cash_asset_currency_code);
        IF v_draw_from_earnings > 0 THEN
            INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
            VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
        END IF;
        IF v_draw_from_capital > 0 THEN
            INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
            VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
        END IF;
        v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
        RETURN v_response;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;