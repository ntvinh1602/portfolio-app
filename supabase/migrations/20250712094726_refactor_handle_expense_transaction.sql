DROP FUNCTION IF EXISTS "public"."handle_expense_transaction"(p_user_id uuid, p_transaction_date date, p_account_id uuid, p_amount numeric, p_description text, p_asset_id uuid);

CREATE OR REPLACE FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
    v_earnings_security_id UUID;
    v_capital_security_id UUID;
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_calculated_amount numeric(16,2);
    v_exchange_rate numeric;
    -- FX Gain/Loss variables
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_remaining_quantity_to_spend numeric(16,2);
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_asset_leg_id uuid;
BEGIN
    -- 1. Get the currency of the cash asset being spent
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset.';
    END IF;
    -- 2. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;
    -- 3. Calculate the amount in the base currency
    IF v_cash_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
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
    -- 4. FX Gain/Loss logic for non-VND cash expenses
    IF v_cash_asset_currency_code != 'VND' THEN
        v_remaining_quantity_to_spend := p_quantity;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
        -- Get Retained Earnings asset
        SELECT id INTO v_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        -- Consume tax lots
        FOR v_lot IN
            SELECT * FROM tax_lots
            WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
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
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'expense', p_description)
        RETURNING id INTO v_transaction_id;
        v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
        -- Create balanced transaction legs
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
    ELSE -- Standard expense logic for VND
        -- Create the transaction
        INSERT INTO public.transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'expense', p_description)
        RETURNING id INTO v_transaction_id;
        -- Credit: Decrease cash from the source account
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_calculated_amount * -1, v_cash_asset_currency_code);
    END IF;
    -- 5. Determine amounts to draw from each equity component for the expense
    SELECT id INTO v_earnings_security_id FROM public.securities WHERE ticker = 'EARNINGS';
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    SELECT a.id, s.currency_code INTO v_earnings_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_earnings_security_id AND a.user_id = p_user_id;
    SELECT a.id, s.currency_code INTO v_capital_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.';
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
            RAISE EXCEPTION 'Expense amount exceeds available capital.';
        END IF;
    END IF;
    -- 6. Create equity transaction legs
    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;
    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
END;
$$;