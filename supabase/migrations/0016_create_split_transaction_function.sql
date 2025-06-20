CREATE OR REPLACE FUNCTION handle_split_transaction(
    p_asset_id UUID,
    p_quantity NUMERIC,
    p_transaction_date TIMESTAMPTZ
)
RETURNS VOID AS $$
DECLARE
    v_transaction_id UUID;
    v_paid_in_capital_asset_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the user_id from the session
    v_user_id := auth.uid();

    -- Get the asset_id for "Paid-in Capital"
    SELECT asset_id INTO v_paid_in_capital_asset_id
    FROM assets
    WHERE name = 'Paid-in Capital' AND user_id = v_user_id;

    -- Insert the transaction
    INSERT INTO transactions (user_id, type, date)
    VALUES (v_user_id, 'split', p_transaction_date)
    RETURNING transaction_id INTO v_transaction_id;

    -- Create transaction legs with zero amount
    -- Debit the asset account
    INSERT INTO transaction_legs (transaction_id, user_id, asset_id, amount, debit_credit)
    VALUES (v_transaction_id, v_user_id, p_asset_id, 0, 'debit');

    -- Credit "Paid-in Capital"
    INSERT INTO transaction_legs (transaction_id, user_id, asset_id, amount, debit_credit)
    VALUES (v_transaction_id, v_user_id, v_paid_in_capital_asset_id, 0, 'credit');

    -- Create a new tax lot with zero cost basis
    INSERT INTO tax_lots (user_id, asset_id, transaction_id, origin, acquired_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (v_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);

END;
$$ LANGUAGE plpgsql;