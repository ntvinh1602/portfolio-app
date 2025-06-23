CREATE OR REPLACE FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric(16,2), "p_interest_payment" numeric(16,2), "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid;
    v_loans_payable_asset_id uuid;
    v_total_payment numeric(16,2);
    v_cash_asset_currency_code text;
    v_liability_currency_code text;
    v_liability_balance numeric(16,2);
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_equity_account_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
BEGIN
    -- 1. Look up asset IDs
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM public.assets WHERE name = 'Loans Payable' AND user_id = p_user_id;

    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_loans_payable_asset_id IS NULL OR v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Core equity/liability assets not found for user %', p_user_id;
    END IF;

    -- 2. Get the currency of the cash asset being used for payment
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;

    -- 4. Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;

    -- 5. Determine amounts to draw from each equity component for the interest payment
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_interest_payment, ABS(v_earnings_balance));
    v_draw_from_capital := p_interest_payment - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Interest payment exceeds available capital.';
        END IF;
    END IF;

    -- 6. Create a new transactions record
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'debt_payment', p_description, p_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 7. Create the transaction legs
    -- Credit: Decrease cash from the paying account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_from_account_id, p_cash_asset_id, v_total_payment * -1, v_total_payment * -1, v_cash_asset_currency_code);

    -- Debit: Decrease the "Loans Payable" liability for the principal portion
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id), v_loans_payable_asset_id, p_principal_payment, p_principal_payment, v_liability_currency_code);

    -- Debit: Decrease Retained Earnings for the interest portion
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital for the interest portion if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;

    -- 8. Check if the debt is now paid off by checking the balance of the liability legs
    SELECT COALESCE(SUM(tl.quantity), 0) INTO v_liability_balance
    FROM transaction_legs tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE t.related_debt_id = p_debt_id AND tl.asset_id = v_loans_payable_asset_id;

    -- If the balance is 0 or positive, the debt is considered paid off.
    IF v_liability_balance >= 0 THEN
        UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
    END IF;

END;
$$;