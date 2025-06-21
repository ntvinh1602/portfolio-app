CREATE OR REPLACE FUNCTION handle_debt_payment_transaction(
    p_user_id uuid,
    p_debt_id uuid,
    p_principal_payment numeric,
    p_interest_payment numeric,
    p_transaction_date date,
    p_from_account_id uuid,
    p_cash_asset_id uuid,
    p_description text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id uuid;
    v_loans_payable_asset_id uuid;
    v_retained_earnings_asset_id uuid;
    v_total_payment numeric;
    v_cash_asset_currency_code text;
    v_liability_currency_code text;
    v_original_principal numeric;
    v_total_principal_paid numeric;
BEGIN
    -- 1. Look up asset IDs and the debt's original principal
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM assets WHERE name = 'Loans Payable' AND user_id = p_user_id;

    SELECT id INTO v_retained_earnings_asset_id
    FROM assets WHERE name = 'Retained Earnings' AND user_id = p_user_id;

    SELECT principal_amount INTO v_original_principal
    FROM debts WHERE id = p_debt_id AND user_id = p_user_id;

    IF v_loans_payable_asset_id IS NULL OR v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Core equity/liability assets not found for user %', p_user_id;
    END IF;

    -- 2. Get the currency of the cash asset being used for payment
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;

    -- 4. Create a new transactions record
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'debt_payment', p_description, p_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    -- Credit: Decrease cash from the paying account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_from_account_id, p_cash_asset_id, v_total_payment * -1, v_total_payment * -1, v_cash_asset_currency_code);

    -- Debit: Decrease the "Loans Payable" liability for the principal portion
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id), v_loans_payable_asset_id, p_principal_payment, p_principal_payment, v_liability_currency_code);

    -- Debit: Decrease "Retained Earnings" for the interest portion (as an expense)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id), v_retained_earnings_asset_id, p_interest_payment, p_interest_payment, v_cash_asset_currency_code);

    -- 6. Check if the debt is now paid off
    SELECT COALESCE(SUM(tl.quantity), 0) INTO v_total_principal_paid
    FROM transaction_legs tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE t.related_debt_id = p_debt_id AND tl.asset_id = v_loans_payable_asset_id;

    IF v_total_principal_paid >= v_original_principal THEN
        UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
    END IF;

END;
$$;