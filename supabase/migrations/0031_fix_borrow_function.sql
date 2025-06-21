CREATE OR REPLACE FUNCTION handle_borrow_transaction(
    p_user_id uuid,
    p_lender_name text,
    p_principal_amount numeric,
    p_interest_rate numeric,
    p_transaction_date date,
    p_deposit_account_id uuid,
    p_cash_asset_id uuid,
    p_description text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_loans_payable_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
    v_liability_currency_code text;
BEGIN
    -- 1. Get or create the 'Loans Payable' asset
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM assets
    WHERE user_id = p_user_id AND name = 'Loans Payable' AND asset_class = 'liability'
    LIMIT 1;

    IF v_loans_payable_asset_id IS NULL THEN
        -- Assuming a default currency for the liability if it needs to be created.
        -- This could be parameterized if needed.
        SELECT display_currency INTO v_liability_currency_code FROM profiles WHERE id = p_user_id;
        INSERT INTO assets (user_id, name, ticker, asset_class, currency_code)
        VALUES (p_user_id, 'Loans Payable', 'LOANS_PAYABLE', 'liability', v_liability_currency_code)
        RETURNING id INTO v_loans_payable_asset_id;
    END IF;

    -- 2. Get the conceptual 'Liability' account
    SELECT id INTO v_loans_payable_account_id
    FROM accounts
    WHERE user_id = p_user_id AND name = 'Liability' AND type = 'conceptual'
    LIMIT 1;

    IF v_loans_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Liability conceptual account not found for user %', p_user_id;
    END IF;

    -- 3. Get the currency of the cash asset that will receive the funds
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Specified cash asset not found for account %', p_deposit_account_id;
    END IF;

    -- 4. Create the debt record
    INSERT INTO debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
    VALUES (p_user_id, p_lender_name, p_principal_amount, v_cash_asset_currency_code, p_interest_rate, p_transaction_date, 'active')
    RETURNING id INTO v_debt_id;

    -- 5. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'borrow', p_description, v_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 6. Create the transaction legs
    -- Debit the deposit account (increase cash)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_deposit_account_id, p_cash_asset_id, p_principal_amount, p_principal_amount, v_cash_asset_currency_code);

    -- Credit the Loans Payable liability account (increase liability)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, v_loans_payable_account_id, v_loans_payable_asset_id, p_principal_amount * -1, p_principal_amount * -1, v_liability_currency_code);

END;
$$;