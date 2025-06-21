-- This migration fixes the dividend transaction function.
-- It corrects the function signature to accept a description and uses an explicit cash asset ID.
-- It does not attempt to use the non-existent 'related_asset_id' column.
CREATE OR REPLACE FUNCTION handle_dividend_transaction(
    p_user_id UUID,
    p_transaction_date DATE,
    p_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_dividend_asset_id UUID, -- The asset that generated the dividend (for description)
    p_cash_asset_id UUID -- The cash asset that is receiving the dividend
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_retained_earnings_asset_id UUID;
    v_transaction_id UUID;
    v_cash_asset_currency_code TEXT;
    v_retained_earnings_currency_code TEXT;
BEGIN
    -- 1. Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- 2. Get the currency of the cash asset receiving the dividend
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'dividend', p_description)
    RETURNING id INTO v_transaction_id;

    -- 4. Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit: Increase cash in the destination account
        (v_transaction_id, p_account_id, p_cash_asset_id, p_amount, p_amount, v_cash_asset_currency_code),
        -- Credit: Increase 'Retained Earnings'
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;