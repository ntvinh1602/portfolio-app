-- This migration updates the handle_bulk_transaction_import function to change the asset ID for dividend transactions.
-- Instead of using the cash asset ID, it now uses the asset ID of the stock that paid the dividend.

DROP FUNCTION IF EXISTS "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb");

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
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id, 'dividend');
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

ALTER FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") TO "service_role";