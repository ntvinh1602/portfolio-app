CREATE OR REPLACE FUNCTION handle_deposit_transaction(
    p_user_id UUID,
    p_transaction_date DATE,
    p_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_capital_asset_id UUID;
    v_capital_asset_currency_code VARCHAR(10);
    v_cash_asset_id UUID;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Get the 'Paid-in Capital' asset
    SELECT id, currency_code INTO v_capital_asset_id, v_capital_asset_currency_code
    FROM assets
    WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_capital_asset_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset.');
    END IF;

    -- 2. Get the destination account's cash asset
    SELECT a.id, a.currency_code INTO v_cash_asset_id, v_cash_asset_currency_code
    FROM assets a
    JOIN accounts acc ON a.account_id = acc.id
    WHERE acc.id = p_account_id AND acc.user_id = p_user_id AND a.type = 'cash';

    IF v_cash_asset_id IS NULL THEN
        RETURN jsonb_build_object('error', 'No cash asset found for the specified account.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id
    FROM accounts
    WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'deposit', COALESCE(p_description, 'Capital contribution'))
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit: Increase cash in the destination account
        (v_transaction_id, p_account_id, v_cash_asset_id, p_amount, p_amount, v_cash_asset_currency_code),
        -- Credit: Increase 'Paid-in Capital'
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, p_amount * -1, p_amount * -1, v_capital_asset_currency_code);

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, the transaction will be rolled back.
        RAISE;
END;
$$;