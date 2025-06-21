-- Update handle_deposit_transaction to accept an asset_id
CREATE OR REPLACE FUNCTION public.handle_deposit_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_amount numeric,
    p_description text,
    p_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_capital_asset_id UUID;
    v_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Get the 'Paid-in Capital' asset
    SELECT id INTO v_capital_asset_id
    FROM public.assets
    WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_capital_asset_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset.');
    END IF;

    -- 2. Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id
    FROM public.accounts
    WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'deposit', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit: Increase cash in the destination account
        (v_transaction_id, p_account_id, p_asset_id, p_amount, p_amount, v_asset_currency_code),
        -- Credit: Increase 'Paid-in Capital'
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, p_amount * -1, p_amount * -1, v_asset_currency_code);

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- Update handle_withdraw_transaction to accept an asset_id
CREATE OR REPLACE FUNCTION public.handle_withdraw_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_amount numeric,
    p_description text,
    p_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_retained_earnings_asset_id UUID;
    v_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Get the 'Retained Earnings' asset
    SELECT id INTO v_retained_earnings_asset_id
    FROM public.assets
    WHERE ticker = 'RETAINED_EARNINGS' AND user_id = p_user_id;

    IF v_retained_earnings_asset_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' asset.');
    END IF;

    -- 2. Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id
    FROM public.accounts
    WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'withdraw', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit: Decrease 'Retained Earnings'
        (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, p_amount, p_amount, v_asset_currency_code),
        -- Credit: Decrease cash in the source account
        (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_asset_currency_code);

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;