-- This migration is intentionally left with a bug for historical tracking.
-- It fails because it references a non-existent "related_asset_id" column.
-- The fix is implemented in migration 0029.
CREATE OR REPLACE FUNCTION handle_dividend_transaction(
    p_user_id UUID,
    p_transaction_date DATE,
    p_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_dividend_asset_id UUID,
    p_cash_asset_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_retained_earnings_asset_id UUID;
    v_transaction_id UUID;
    v_cash_asset_currency_code TEXT;
    v_retained_earnings_currency_code TEXT;
BEGIN
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- This is the line that causes the error
    INSERT INTO transactions (user_id, transaction_date, type, description, related_asset_id)
    VALUES (p_user_id, p_transaction_date, 'dividend', p_description, p_dividend_asset_id)
    RETURNING id INTO v_transaction_id;

    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_cash_asset_id, p_amount, p_amount, v_cash_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;