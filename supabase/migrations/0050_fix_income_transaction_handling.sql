CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric, "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
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
    VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, COALESCE(p_quantity, p_amount), p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_record jsonb; v_transaction_type text; v_asset_id uuid; v_cash_asset_id uuid; v_dividend_asset_id uuid; v_account_id uuid; v_debt_id uuid; v_asset_ticker text; v_cash_asset_ticker text; v_dividend_asset_ticker text; v_account_name text; v_lender_name text;
BEGIN
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN RAISE EXCEPTION 'Input must be a JSON array of transactions.'; END IF;
    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_dividend_asset_ticker := v_transaction_record->>'dividend_asset_ticker';
        v_account_name := v_transaction_record->>'account';

        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_asset_id FROM public.assets WHERE ticker = v_asset_ticker AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset with ticker % not found.', v_asset_ticker; END IF;
        END IF;
        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE ticker = v_cash_asset_ticker AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN RAISE EXCEPTION 'Cash asset with ticker % not found.', v_cash_asset_ticker; END IF;
        END IF;
        IF v_dividend_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_dividend_asset_id FROM public.assets WHERE ticker = v_dividend_asset_ticker AND user_id = p_user_id;
            IF v_dividend_asset_id IS NULL THEN RAISE EXCEPTION 'Dividend-paying asset with ticker % not found.', v_dividend_asset_ticker; END IF;
        END IF;
        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account with name % not found.', v_account_name; END IF;
        END IF;

        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, v_asset_id, v_cash_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'price')::numeric(10,2), (v_transaction_record->>'fees')::numeric(16,2), v_transaction_record->>'description');
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'quantity')::numeric * (v_transaction_record->>'price')::numeric, (v_transaction_record->>'fees')::numeric(16,2), (v_transaction_record->>'taxes')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'debt_payment' THEN
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
                PERFORM "public"."handle_debt_payment_transaction"(p_user_id, v_debt_id, (v_transaction_record->>'principal_payment')::numeric(16,2), (v_transaction_record->>'interest_payment')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id, 'income');
            WHEN 'dividend' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_cash_asset_id, 'dividend');
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(p_user_id, v_transaction_record->>'counterparty', (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'interest_rate')::numeric(4,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'date')::date, v_transaction_record->>'description');
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;
END;
$$;