CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
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
    v_response JSONB;
BEGIN
    -- 1. Fetch required equity asset records
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.');
    END IF;

    -- 2. Get the currency of the cash asset being withdrawn
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified cash asset.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Determine amounts to draw from each equity component
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.');
        END IF;
    END IF;

    -- 5. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'withdraw', COALESCE(p_description, 'Owner draw'))
    RETURNING id INTO v_transaction_id;

    -- 6. Create transaction legs
    -- Credit: Decrease cash from the source account
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code);

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

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;