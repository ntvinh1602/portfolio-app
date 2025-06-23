CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"(
  "p_user_id" "uuid",
  "p_transactions_data" "jsonb"
)
RETURNS "void"
LANGUAGE "plpgsql"
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
BEGIN
    -- Check if the input is a valid JSON array
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN
        RAISE EXCEPTION 'Input must be a JSON array of transactions.';
    END IF;

    -- Iterate over each transaction object in the JSON array
    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        -- Extract identifiers from the JSON record
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_account_name := v_transaction_record->>'account';

        -- Look up asset_id from asset_ticker
        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_asset_id FROM public.assets WHERE ticker = v_asset_ticker AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN
                RAISE EXCEPTION 'Asset with ticker % not found.', v_asset_ticker;
            END IF;
        END IF;

        -- Look up cash_asset_id from cash_asset_ticker
        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE ticker = v_cash_asset_ticker AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN
                RAISE EXCEPTION 'Cash asset with ticker % not found.', v_cash_asset_ticker;
            END IF;
        END IF;

        -- Look up account_id from account_name
        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN
                RAISE EXCEPTION 'Account with name % not found.', v_account_name;
            END IF;
        END IF;

        -- Use a CASE statement to call the appropriate handler function
        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(
                    p_user_id,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    v_asset_id,
                    v_cash_asset_id,
                    (v_transaction_record->>'quantity')::integer,
                    (v_transaction_record->>'price')::numeric,
                    (v_transaction_record->>'fees')::numeric,
                    v_transaction_record->>'description'
                );
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(
                    p_user_id,
                    v_asset_id,
                    (v_transaction_record->>'quantity')::integer,
                    (v_transaction_record->>'quantity')::numeric * (v_transaction_record->>'price')::numeric, -- Calculate total_proceeds
                    (v_transaction_record->>'fees')::numeric,
                    (v_transaction_record->>'taxes')::numeric,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    v_cash_asset_id,
                    v_transaction_record->>'description'
                );
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(
                    p_user_id,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    (v_transaction_record->>'amount')::numeric,
                    v_transaction_record->>'description',
                    v_asset_id
                );
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(
                    p_user_id,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    (v_transaction_record->>'amount')::numeric,
                    v_transaction_record->>'description',
                    v_asset_id
                );
            WHEN 'debt_payment' THEN
                -- Look up the debt_id using the lender's name from the 'counterparty' field
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN
                    RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
                END IF;

                PERFORM "public"."handle_debt_payment_transaction"(
                    p_user_id,
                    v_debt_id,
                    (v_transaction_record->>'principal_payment')::numeric,
                    (v_transaction_record->>'interest_payment')::numeric,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    v_cash_asset_id,
                    v_transaction_record->>'description'
                );
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(
                    p_user_id,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    (v_transaction_record->>'amount')::numeric,
                    v_transaction_record->>'description',
                    v_asset_id
                );
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(
                    p_user_id,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    (v_transaction_record->>'amount')::numeric,
                    v_transaction_record->>'description',
                    v_asset_id
                );
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(
                    p_user_id,
                    v_transaction_record->>'counterparty',
                    (v_transaction_record->>'amount')::numeric,
                    (v_transaction_record->>'interest_rate')::numeric,
                    (v_transaction_record->>'date')::date,
                    v_account_id,
                    v_cash_asset_id,
                    v_transaction_record->>'description'
                );
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(
                    p_user_id,
                    v_asset_id,
                    (v_transaction_record->>'quantity')::integer,
                    (v_transaction_record->>'date')::date,
                    v_transaction_record->>'description'
                );
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;
END;
$$;