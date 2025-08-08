ALTER TABLE public.transactions
ADD COLUMN price numeric(16, 4);


drop function if exists "public"."handle_buy_transaction"("uuid", "date", "uuid", "uuid", "uuid", numeric, numeric, numeric, "text");

CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_description" "text") RETURNS "uuid"
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
        INSERT INTO transactions (user_id, transaction_date, type, description, price)
        VALUES (p_user_id, p_transaction_date, 'buy', p_description, p_price)
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
        INSERT INTO transactions (user_id, transaction_date, type, description, price) VALUES (p_user_id, p_transaction_date, 'buy', p_description, p_price) RETURNING id INTO v_transaction_id;
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

drop function if exists "public"."handle_sell_transaction"("uuid", "uuid", numeric, numeric, numeric, numeric, "date", "uuid", "uuid", "text");

CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id uuid;
    v_net_proceeds_native_currency numeric;
    v_cash_asset_currency_code text;
    v_sold_asset_currency_code text;
    v_exchange_rate numeric;
    v_proceeds_in_vnd numeric;
    
    -- Sell asset cost basis variables
    v_total_cost_basis_vnd numeric := 0;
    v_realized_gain_loss_vnd numeric;
    v_remaining_quantity_to_sell numeric := p_quantity_to_sell;
    v_lot record;
    v_quantity_from_lot numeric;
    v_cost_basis_from_lot_vnd numeric;
    v_asset_leg_id uuid;
    
    -- Equity-related variables
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_equity_account_id UUID;
    v_retained_earnings_security_id UUID;
BEGIN
    -- 1. Get currency codes for sold asset and cash asset
    SELECT s.currency_code INTO v_sold_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id;
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;

    -- 2. Calculate net proceeds and their value in VND
    v_net_proceeds_native_currency := p_quantity_to_sell * p_price;
    IF v_cash_asset_currency_code != 'VND' THEN
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
        END IF;
        v_proceeds_in_vnd := v_net_proceeds_native_currency * v_exchange_rate;
    ELSE
        v_proceeds_in_vnd := v_net_proceeds_native_currency;
    END IF;

    -- 3. Consume tax lots of the sold asset to find its total cost basis in VND
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
    FOR v_lot IN
        SELECT * FROM tax_lots
        WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
        ORDER BY creation_date ASC
    LOOP
        IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
        v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
        v_cost_basis_from_lot_vnd := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
        
        UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
        INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
        
        v_total_cost_basis_vnd := v_total_cost_basis_vnd + v_cost_basis_from_lot_vnd;
        v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_sell > 0 THEN
        RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell);
    END IF;

    -- 4. Calculate realized gain/loss for the sold asset
    v_realized_gain_loss_vnd := v_proceeds_in_vnd - v_total_cost_basis_vnd;

    -- 5. Get Retained Earnings asset and Equity account
    SELECT id INTO v_retained_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
    IF v_retained_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
    SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets a JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.'; END IF;

    -- 6. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, price)
    VALUES (p_user_id, p_transaction_date, 'sell', p_description, p_price)
    RETURNING id INTO v_transaction_id;

    -- 7. Create balanced transaction legs (all amounts in VND)
    -- Debit the cash asset for the net proceeds
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_cash_asset_id, v_net_proceeds_native_currency, v_proceeds_in_vnd, v_cash_asset_currency_code);
    -- Credit the sold asset at its cost basis
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_asset_id, p_quantity_to_sell * -1, v_total_cost_basis_vnd * -1, v_sold_asset_currency_code)
    RETURNING id INTO v_asset_leg_id;
    -- Credit/Debit Retained Earnings with the realized gain/loss
    IF v_realized_gain_loss_vnd != 0 THEN
         INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
         VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss_vnd * -1, v_realized_gain_loss_vnd * -1, v_retained_earnings_currency_code);
    END IF;

    -- 8. Create lot consumptions for the sold asset
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
        INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
        VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;

    -- 9. Create a new tax lot for the received cash asset if it's not in VND
    IF v_cash_asset_currency_code != 'VND' THEN
        INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_cash_asset_id, v_transaction_id, 'purchase', p_transaction_date, v_net_proceeds_native_currency, v_net_proceeds_native_currency, v_proceeds_in_vnd);
    END IF;
    
    RETURN v_transaction_id;
END;
$$;