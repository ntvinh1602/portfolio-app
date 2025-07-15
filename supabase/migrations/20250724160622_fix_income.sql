CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
    v_retained_earnings_security_id uuid;
    v_asset_class text;
    v_calculated_amount numeric;
    v_exchange_rate numeric;
BEGIN
    -- Get asset details
    SELECT s.currency_code, s.asset_class
    INTO v_asset_currency_code, v_asset_class
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;
    -- Calculate the amount
    IF v_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency_code, p_transaction_date;
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get the 'Retained Earnings' security for the user
    SELECT id INTO v_retained_earnings_security_id
    FROM securities
    WHERE ticker = 'EARNINGS'
    LIMIT 1;
    IF v_retained_earnings_security_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings security not found';
    END IF;
    -- Get the user's 'Retained Earnings' asset
    SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id
    LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;
    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description)
    RETURNING id INTO v_transaction_id;
    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_calculated_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, v_calculated_amount * -1, v_calculated_amount * -1, v_retained_earnings_currency_code);
    -- Create tax lot for non-VND cash assets
    IF (v_asset_class = 'cash' or v_asset_class = 'epf') AND v_asset_currency_code != 'VND' THEN
        INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
    END IF;
END;
$$;