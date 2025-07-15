CREATE OR REPLACE FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
    v_calculated_amount numeric;
    v_asset_currency_code text;
    v_asset_class text;
    v_capital_security_id UUID;
    v_exchange_rate numeric;
BEGIN
    -- Get asset details
    SELECT s.currency_code, s.asset_class
    INTO v_asset_currency_code, v_asset_class
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;
    -- Calculate the amount
    IF v_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_asset_currency_code
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find exchange rate for ' || v_asset_currency_code);
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get capital asset and equity account
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    IF v_capital_security_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' security.'); END IF;
    SELECT id INTO v_capital_asset_id FROM public.assets WHERE security_id = v_capital_security_id AND user_id = p_user_id;
    IF v_capital_asset_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset for user.'); END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.'); END IF;
    -- Create transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'deposit', p_description)
    RETURNING id INTO v_transaction_id;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_calculated_amount, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, p_quantity * -1, v_calculated_amount * -1, v_asset_currency_code);
    -- Create tax lot for non-VND cash assets
    -- TODO: In the future, handle non-cash assets like stocks and crypto by fetching their market price.
    IF (v_asset_class = 'cash' or v_asset_class = 'epf') AND v_asset_currency_code != 'VND' THEN
        INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
    END IF;
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;