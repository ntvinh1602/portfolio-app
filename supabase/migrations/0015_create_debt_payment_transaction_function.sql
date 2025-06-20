CREATE OR REPLACE FUNCTION handle_debt_payment_transaction(
    p_debt_id BIGINT,
    p_principal_payment NUMERIC,
    p_interest_payment NUMERIC,
    p_transaction_date TIMESTAMPTZ,
    p_from_account_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id BIGINT;
    v_loans_payable_asset_id BIGINT;
    v_retained_earnings_asset_id BIGINT;
    v_total_payment NUMERIC;
BEGIN
    -- Ensure the entire operation is atomic
    -- Look up the asset IDs for "Loans Payable" and "Retained Earnings"
    SELECT id INTO v_loans_payable_asset_id FROM assets WHERE name = 'Loans Payable';
    SELECT id INTO v_retained_earnings_asset_id FROM assets WHERE name = 'Retained Earnings';

    -- Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;

    -- Update the principal_amount in the debts table
    UPDATE debts
    SET principal_amount = principal_amount - p_principal_payment
    WHERE id = p_debt_id;

    -- Create a new transactions record
    INSERT INTO transactions (type, date)
    VALUES ('debt_payment', p_transaction_date)
    RETURNING id INTO v_transaction_id;

    -- Create the required three transaction_legs
    -- 1. Credit to the from_account_id for the total payment amount
    INSERT INTO transaction_legs (transaction_id, asset_id, amount, type)
    VALUES (v_transaction_id, p_from_account_id, v_total_payment, 'credit');

    -- 2. Debit to the "Loans Payable" liability asset for the principal_payment amount
    INSERT INTO transaction_legs (transaction_id, asset_id, amount, type)
    VALUES (v_transaction_id, v_loans_payable_asset_id, p_principal_payment, 'debit');

    -- 3. Debit to the "Retained Earnings" equity asset for the interest_payment amount
    INSERT INTO transaction_legs (transaction_id, asset_id, amount, type)
    VALUES (v_transaction_id, v_retained_earnings_asset_id, p_interest_payment, 'debit');

    RETURN v_transaction_id;
END;
$$;