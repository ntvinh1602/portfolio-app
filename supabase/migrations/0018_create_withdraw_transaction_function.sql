CREATE OR REPLACE FUNCTION get_asset_balance(p_asset_id UUID, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);

    RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION handle_withdraw_transaction(
    p_user_id UUID,
    p_transaction_date DATE,
    p_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset RECORD;
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC;
    v_draw_from_earnings NUMERIC;
    v_draw_from_capital NUMERIC;
    v_capital_balance NUMERIC;
    v_response JSONB;
BEGIN
    -- 1. Fetch required asset and account IDs
    SELECT id, currency_code INTO v_earnings_asset FROM assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.');
    END IF;

    SELECT a.id, a.currency_code INTO v_cash_asset
    FROM assets a
    JOIN accounts acc ON a.account_id = acc.id
    WHERE acc.id = p_account_id AND acc.user_id = p_user_id AND a.type = 'cash';

    IF v_cash_asset.id IS NULL THEN
        RETURN jsonb_build_object('error', 'No cash asset found for the specified account.');
    END IF;

    SELECT id INTO v_equity_account_id FROM accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 2. Determine amounts to draw from each equity component
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_amount, v_earnings_balance);
    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > v_capital_balance THEN
            RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.');
        END IF;
    END IF;

    -- 3. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'withdraw', COALESCE(p_description, 'Owner draw'))
    RETURNING id INTO v_transaction_id;

    -- 4. Create transaction legs
    -- Debit: Decrease cash from the source account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, v_cash_asset.id, p_amount * -1, p_amount * -1, v_cash_asset.currency_code);

    -- Credit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Credit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;