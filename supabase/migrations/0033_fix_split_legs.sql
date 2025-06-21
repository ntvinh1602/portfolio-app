CREATE OR REPLACE FUNCTION handle_split_transaction(
    p_user_id uuid,
    p_asset_id UUID,
    p_quantity NUMERIC,
    p_transaction_date DATE,
    p_description TEXT
)
RETURNS VOID AS $$
DECLARE
    v_transaction_id UUID;
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_asset_account_id UUID;
    v_asset_currency_code TEXT;
BEGIN
    -- 1. Get the user's conceptual "Equity" account
    SELECT id INTO v_equity_account_id
    FROM accounts
    WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity'
    LIMIT 1;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id;
    END IF;

    -- 2. Get the user's "Paid-in Capital" asset
    SELECT id INTO v_capital_asset_id
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'CAPITAL'
    LIMIT 1;

    IF v_capital_asset_id IS NULL THEN
        RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id;
    END IF;
    
    -- 3. Find the primary account holding the asset being split.
    -- This is a simplification; a user might hold the same asset in multiple accounts.
    -- We'll pick the first one found.
    SELECT account_id, a.currency_code INTO v_asset_account_id, v_asset_currency_code
    FROM transaction_legs tl
    JOIN assets a ON a.id = tl.asset_id
    WHERE tl.asset_id = p_asset_id
    LIMIT 1;

    IF v_asset_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not determine an account for the asset being split (%). No prior transactions found.', p_asset_id;
    END IF;

    -- 4. Insert the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'split', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create zero-amount transaction legs
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit the asset account to record the event, but with zero value change. Quantity is informational.
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        -- Credit Paid-in Capital as the balancing entry, also with zero value.
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);

    -- 6. Create the new tax lot
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);

END;
$$ LANGUAGE plpgsql;