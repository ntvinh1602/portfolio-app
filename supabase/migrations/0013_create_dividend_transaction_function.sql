CREATE OR REPLACE FUNCTION handle_dividend_transaction(
    p_user_id UUID,
    p_account_id BIGINT,
    p_amount NUMERIC,
    p_transaction_date TIMESTAMPTZ,
    p_asset_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_retained_earnings_asset_id BIGINT;
    v_transaction_id BIGINT;
BEGIN
    -- Get the ID of the 'Retained Earnings' asset
    SELECT asset_id INTO v_retained_earnings_asset_id
    FROM assets
    WHERE asset_name = 'Retained Earnings'
    AND user_id = p_user_id;

    -- If 'Retained Earnings' asset not found, raise an exception
    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Create a new transaction
    INSERT INTO transactions (user_id, transaction_type, transaction_date, related_asset_id)
    VALUES (p_user_id, 'dividend', p_transaction_date, p_asset_id)
    RETURNING transaction_id INTO v_transaction_id;

    -- Create two transaction legs
    -- 1. Debit to the specified cash account
    INSERT INTO transaction_legs (transaction_id, account_id, amount, leg_type)
    VALUES (v_transaction_id, p_account_id, p_amount, 'debit');

    -- 2. Credit to the 'Retained Earnings' asset
    INSERT INTO transaction_legs (transaction_id, account_id, amount, leg_type)
    VALUES (v_transaction_id, v_retained_earnings_asset_id, p_amount, 'credit');

    RETURN v_transaction_id;
END;
$$;