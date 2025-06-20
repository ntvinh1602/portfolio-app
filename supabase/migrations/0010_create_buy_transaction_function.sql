CREATE OR REPLACE FUNCTION handle_buy_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_asset_id uuid,
    p_quantity numeric,
    p_price numeric,
    p_fees numeric,
    p_description text
)
RETURNS uuid -- Returns the new transaction_id
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id uuid;
    v_cost_basis numeric;
    v_cash_asset_id uuid;
    v_cash_asset_currency_code text;
    v_purchased_asset_currency_code text;
BEGIN
    -- 1. Calculate total cost basis
    v_cost_basis := (p_quantity * p_price) + p_fees;

    -- 2. Get the cash asset details from the specified account
    SELECT a.id, a.currency_code INTO v_cash_asset_id, v_cash_asset_currency_code
    FROM assets a
    JOIN accounts acc ON a.id = acc.asset_id -- Assuming a direct link for cash accounts
    WHERE acc.id = p_account_id AND acc.user_id = p_user_id;

    IF v_cash_asset_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a cash asset linked to account ID %', p_account_id;
    END IF;

    -- 3. Get the currency code for the purchased asset
    SELECT currency_code INTO v_purchased_asset_currency_code
    FROM assets
    WHERE id = p_asset_id;

    -- 4. Create the main transaction record
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'buy', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Credit: Decrease cash from the source account
        (v_transaction_id, p_account_id, v_cash_asset_id, v_cost_basis * -1, v_cost_basis * -1, v_cash_asset_currency_code),
        -- Debit: Increase the asset in the same account (or a dedicated brokerage account)
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis, v_purchased_asset_currency_code);

    -- 6. Create the tax lot
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis);

    RETURN v_transaction_id;
END;
$$;