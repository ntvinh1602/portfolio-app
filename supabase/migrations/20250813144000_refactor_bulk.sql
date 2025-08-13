drop function if exists "public"."handle_bulk_transaction_import"("uuid", "jsonb", "date");

CREATE OR REPLACE FUNCTION "public"."import_transactions"("p_user_id" "uuid", "p_transactions_data" "jsonb", "p_start_date" "date") RETURNS "void"
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_transaction_record jsonb;
  v_transaction_type text;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_debt_id uuid;
  v_asset_ticker text;
  v_cash_asset_ticker text;
  v_lender_name text;
  v_security_id uuid;
BEGIN
  IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of transactions.';
  END IF;

  -- Temporarily disable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions DISABLE TRIGGER USER;

  FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
  LOOP
    v_transaction_type := v_transaction_record->>'type';

    v_asset_ticker := v_transaction_record->>'asset_ticker';
    IF v_asset_ticker IS NOT NULL THEN
      v_asset_id := public.get_asset_id_from_ticker(p_user_id, v_asset_ticker);
    END IF;

    v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
    IF v_cash_asset_ticker IS NOT NULL THEN
      v_cash_asset_id := public.get_asset_id_from_ticker(p_user_id, v_cash_asset_ticker);
    END IF;

    CASE v_transaction_type
      WHEN 'buy' THEN PERFORM "public"."add_buy_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        v_asset_id,
        v_cash_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'sell' THEN PERFORM "public"."add_sell_transaction"(
        p_user_id,
        v_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'price')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'deposit' THEN PERFORM "public"."add_deposit_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'withdraw' THEN PERFORM "public"."add_withdraw_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'debt_payment' THEN
        v_lender_name := v_transaction_record->>'counterparty';
        SELECT id INTO v_debt_id
        FROM public.debts
        WHERE lender_name = v_lender_name
          AND user_id = p_user_id
          AND status = 'active';
        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
        END IF;
        PERFORM "public"."add_debt_payment_transaction"(
          p_user_id,
          v_debt_id,
          (v_transaction_record->>'principal')::numeric,
          (v_transaction_record->>'interest')::numeric,
          (v_transaction_record->>'date')::date,
          v_cash_asset_id,
          v_transaction_record->>'description',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'income' THEN
        PERFORM "public"."add_income_transaction"(
          p_user_id,
          (v_transaction_record->>'date')::date,
          (v_transaction_record->>'quantity')::numeric,
          v_transaction_record->>'description',
          v_cash_asset_id,
          'income',
          (v_transaction_record->>'created_at')::timestamptz
        );
      WHEN 'dividend' THEN
        IF v_asset_ticker = 'EPF' THEN
          PERFORM "public"."add_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        ELSE
          PERFORM "public"."add_income_transaction"(
            p_user_id,
            (v_transaction_record->>'date')::date,
            (v_transaction_record->>'quantity')::numeric,
            v_transaction_record->>'description',
            v_cash_asset_id,
            'dividend',
            (v_transaction_record->>'created_at')::timestamptz
          );
        END IF;
      WHEN 'expense' THEN PERFORM "public"."add_expense_transaction"(
        p_user_id,
        (v_transaction_record->>'date')::date,
        (v_transaction_record->>'quantity')::numeric,
        v_transaction_record->>'description',
        v_asset_id,
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'borrow' THEN PERFORM "public"."add_borrow_transaction"(
        p_user_id,
        v_transaction_record->>'counterparty',
        (v_transaction_record->>'principal')::numeric,
        (v_transaction_record->>'interest_rate')::numeric,
        (v_transaction_record->>'date')::date,
        v_cash_asset_id,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      WHEN 'split' THEN PERFORM "public"."add_split_transaction"(
        p_user_id,
        v_asset_id,
        (v_transaction_record->>'quantity')::numeric,
        (v_transaction_record->>'date')::date,
        v_transaction_record->>'description',
        (v_transaction_record->>'created_at')::timestamptz
      );
      ELSE
        RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
    END CASE;
  END LOOP;

  -- Re-enable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions ENABLE TRIGGER USER;
  
  -- Generate the performance snapshots in a single batch
  PERFORM public.generate_performance_snapshots(p_user_id, p_start_date, CURRENT_DATE);
END;
$$;

alter table public.transaction_legs drop column account_id;
DROP TABLE IF EXISTS public.accounts; 