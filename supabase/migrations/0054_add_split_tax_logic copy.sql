CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_total_proceeds" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_remaining_quantity_to_sell numeric(16,2) := p_quantity_to_sell;
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_cash_asset_currency_code text;
    v_sold_asset_currency_code text;
    v_retained_earnings_currency_code text;
    v_asset_leg_id uuid;
    v_consumed_lot record;
    v_additional_tax numeric(16,2) := 0;
    v_total_taxes numeric(16,2) := 0;
BEGIN
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code FROM assets WHERE user_id = p_user_id AND name = 'Retained Earnings' AND asset_class = 'equity' LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
    SELECT currency_code INTO v_cash_asset_currency_code FROM assets WHERE id = p_cash_asset_id AND user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;
    SELECT currency_code INTO v_sold_asset_currency_code FROM assets WHERE id = p_asset_id;
    FOR v_lot IN SELECT * FROM tax_lots WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0 ORDER BY creation_date ASC LOOP
        IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
        v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
        v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;

        IF v_lot.origin = 'split' THEN
            v_additional_tax := v_additional_tax + (v_quantity_from_lot * 500);
        END IF;

        UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
        INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
        v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
        v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_sell > 0 THEN RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell); END IF;

    v_total_taxes := p_taxes + v_additional_tax;

    INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'sell', p_description) RETURNING id INTO v_transaction_id;
    v_realized_gain_loss := p_total_proceeds - v_total_cost_basis - p_fees - v_total_taxes;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, p_cash_account_id, p_cash_asset_id, p_total_proceeds - p_fees - v_total_taxes, p_total_proceeds - p_fees - v_total_taxes, v_cash_asset_currency_code);
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, p_cash_account_id, p_asset_id, p_quantity_to_sell * -1, v_total_cost_basis * -1, v_sold_asset_currency_code) RETURNING id INTO v_asset_leg_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES (v_transaction_id, (SELECT id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);
    FOR v_consumed_lot IN SELECT * FROM temp_consumed_lots LOOP INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed) VALUES (v_asset_leg_id, v_consumed_lot.lot_id, v_consumed_lot.quantity_consumed); END LOOP;
    INSERT INTO transaction_details (transaction_id, price, fees, taxes) VALUES (v_transaction_id, p_total_proceeds / p_quantity_to_sell, p_fees, v_total_taxes);
    RETURN v_transaction_id;
END;
$$;