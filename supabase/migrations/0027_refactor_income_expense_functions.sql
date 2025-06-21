-- Step 1: Drop the old combined function
DROP FUNCTION IF EXISTS handle_income_expense_transaction(uuid, date, uuid, numeric, text, public.transaction_type, uuid);

-- Step 2: Create the new, simpler function for handling income
CREATE OR REPLACE FUNCTION handle_income_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_amount numeric,
    p_description text,
    p_asset_id uuid -- This is the cash asset being received
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
BEGIN
    -- Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'income', p_description)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_amount, p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;

-- Step 3: Create the new, more robust function for handling expenses
CREATE OR REPLACE FUNCTION handle_expense_transaction(
    p_user_id uuid,
    p_transaction_date date,
    p_account_id uuid,
    p_amount numeric,
    p_description text,
    p_asset_id uuid -- This is the cash asset being spent
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC;
    v_draw_from_earnings NUMERIC;
    v_draw_from_capital NUMERIC;
    v_capital_balance NUMERIC;
BEGIN
    -- 1. Fetch required equity asset records
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.';
    END IF;

    -- 2. Get the currency of the cash asset being spent
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset.';
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;

    -- 4. Determine amounts to draw from each equity component
    -- Note: get_asset_balance returns a negative value for equity, so we use ABS()
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Expense amount exceeds available capital.';
        END IF;
    END IF;

    -- 5. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'expense', p_description)
    RETURNING id INTO v_transaction_id;

    -- 6. Create transaction legs
    -- Credit: Decrease cash from the source account
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code);

    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
END;
$$;