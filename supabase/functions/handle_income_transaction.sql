CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
BEGIN
    -- Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'income', p_description)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_amount, p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;