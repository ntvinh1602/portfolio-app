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
BEGIN
    -- Insert the transaction with a description
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'split', p_description)
    RETURNING id INTO v_transaction_id;

    -- Create a new tax lot with zero cost basis
    -- The transaction legs for a split are often zero-amount, as it's a change in the number of shares,
    -- not a value exchange. The core event is the creation of a new lot.
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);

END;
$$ LANGUAGE plpgsql;