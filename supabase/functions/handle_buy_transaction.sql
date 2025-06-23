CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"(
    "p_user_id" "uuid", 
    "p_transaction_date" "date", 
    "p_account_id" "uuid", 
    "p_asset_id" "uuid", 
    "p_cash_asset_id" "uuid", 
    "p_quantity" integer, 
    "p_price" numeric(10,2), 
    "p_fees" numeric(16,2), 
    "p_description" "text"
) 
    RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid;
    v_cost_basis numeric(16,2);
    v_cash_asset_currency_code text;
    v_purchased_asset_currency_code text;
BEGIN
    -- 1. Calculate total cost basis
    v_cost_basis := (p_quantity * p_price) + p_fees;

    -- 2. Get the currency code for the selected cash asset
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset with ID %', p_cash_asset_id;
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
        (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_basis * -1, v_cost_basis * -1, v_cash_asset_currency_code),
        -- Debit: Increase the asset in the same account
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis, v_purchased_asset_currency_code);

    -- 6. Create the tax lot
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis);

    -- 7. Insert into transaction_details
    INSERT INTO transaction_details (transaction_id, price, fees, taxes)
    VALUES (v_transaction_id, p_price, p_fees, 0);

    RETURN v_transaction_id;
END;
$$;