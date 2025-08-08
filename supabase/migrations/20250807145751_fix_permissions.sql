CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") RETURNS "void"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
    v_transaction_record jsonb;
    v_transaction_type text;
    v_asset_id uuid;
    v_cash_asset_id uuid;
    v_account_id uuid;
    v_debt_id uuid;
    v_asset_ticker text;
    v_cash_asset_ticker text;
    v_account_name text;
    v_lender_name text;
    v_security_id uuid;
    v_min_date date;
BEGIN
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN RAISE EXCEPTION 'Input must be a JSON array of transactions.'; END IF;

    -- Temporarily disable all triggers on the transactions table
    ALTER TABLE public.transactions DISABLE TRIGGER ALL;

    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_account_name := v_transaction_record->>'account';

        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_asset_ticker; END IF;
            SELECT id INTO v_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_asset_ticker; END IF;
        END IF;

        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_cash_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_cash_asset_ticker; END IF;
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_cash_asset_ticker; END IF;
        END IF;

        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account with name % not found.', v_account_name; END IF;
        END IF;

        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, v_asset_id, v_cash_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'price')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'debt_payment' THEN
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
                PERFORM "public"."handle_debt_payment_transaction"(p_user_id, v_debt_id, (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_cash_asset_id, 'income', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'dividend' THEN
                IF v_asset_ticker = 'EPF' THEN
                    PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, 'dividend', (v_transaction_record->>'created_at')::timestamptz);
                ELSE
                    PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_cash_asset_id, 'dividend', (v_transaction_record->>'created_at')::timestamptz);
                END IF;
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'quantity')::numeric, v_transaction_record->>'description', v_asset_id, (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(p_user_id, v_transaction_record->>'counterparty', (v_transaction_record->>'principal')::numeric, (v_transaction_record->>'interest_rate')::numeric, (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric, (v_transaction_record->>'date')::date, v_transaction_record->>'description', (v_transaction_record->>'created_at')::timestamptz);
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;

    -- Re-enable all triggers on the transactions table
    ALTER TABLE public.transactions ENABLE TRIGGER ALL;

    -- Find the earliest transaction date to start generating snapshots from
    SELECT MIN((value->>'date')::date) INTO v_min_date FROM jsonb_array_elements(p_transactions_data);

    -- Generate the performance snapshots in a single batch
    PERFORM public.generate_performance_snapshots(p_user_id, v_min_date, CURRENT_DATE);

END;
$$;