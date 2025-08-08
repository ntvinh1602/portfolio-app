drop function if exists "public"."handle_borrow_transaction"("uuid", "text", numeric, numeric, "date", "uuid", "uuid", "text");

CREATE OR REPLACE FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamptz default now()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_loans_payable_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
    v_liability_currency_code text;
    v_loans_payable_security_id uuid;
BEGIN
    -- 1. Get or create the 'Loans Payable' security and the user's corresponding asset
    SELECT id, currency_code INTO v_loans_payable_security_id, v_liability_currency_code
    FROM securities
    WHERE ticker = 'LOANS_PAYABLE'
    LIMIT 1;
    IF v_loans_payable_security_id IS NULL THEN
        -- This should ideally be pre-seeded, but we can create it as a fallback.
        SELECT display_currency INTO v_liability_currency_code FROM profiles WHERE id = p_user_id;
        INSERT INTO securities (asset_class, ticker, name, currency_code)
        VALUES ('liability', 'LOANS_PAYABLE', 'Loans Payable', v_liability_currency_code)
        RETURNING id INTO v_loans_payable_security_id;
    END IF;
    SELECT id INTO v_loans_payable_asset_id
    FROM assets
    WHERE user_id = p_user_id AND security_id = v_loans_payable_security_id;
    IF v_loans_payable_asset_id IS NULL THEN
        INSERT INTO assets (user_id, security_id)
        VALUES (p_user_id, v_loans_payable_security_id)
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
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Specified cash asset not found for account %', p_deposit_account_id;
    END IF;
    -- 4. Create the debt record
    INSERT INTO debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
    VALUES (p_user_id, p_lender_name, p_principal_amount, v_cash_asset_currency_code, p_interest_rate, p_transaction_date, 'active')
    RETURNING id INTO v_debt_id;
    -- 5. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
    VALUES (p_user_id, p_transaction_date, 'borrow', p_description, v_debt_id, p_created_at)
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