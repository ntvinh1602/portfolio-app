ALTER TYPE transaction_type ADD VALUE 'repay';

drop function if exists "public"."add_debt_payment_transaction"("uuid", numeric, numeric, "date", "uuid", "text", timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."add_repay_transaction"("p_debt_id" "uuid", "p_paid_principal" numeric, "p_paid_interest" numeric, "p_txn_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transaction_id uuid;
  v_total_payment numeric;
  v_owner_capital_asset_id uuid;
  v_debts_asset_id uuid;
BEGIN
  -- 1. Look up user-specific asset IDs
  v_debts_asset_id := public.get_asset_id_from_ticker('DEBTS');
  v_owner_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');

  -- 2. Calculate the total payment amount
  v_total_payment := p_paid_principal + p_paid_interest;

  -- 3. Create a new transactions record
  INSERT INTO public.transactions (transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_txn_date,
    'repay',
    p_description,
    p_debt_id,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
VALUES
  -- Credit: Decrease cash from the paying account
  (v_transaction_id,
  p_cash_asset_id,
  v_total_payment * -1,
  v_total_payment * -1,
  'VND'),
  -- Debit: Decrease the "Debts Principal" for principal portion
  (v_transaction_id,
  v_debts_asset_id,
  p_paid_principal,
  p_paid_principal,
  'VND'),
  -- Debit: Decrease Owner Capital for interest portion
  (v_transaction_id,
  v_owner_capital_asset_id,
  p_paid_interest,
  p_paid_interest,
  'VND');

  -- 5. Mark the debt as paid
  UPDATE public.debts SET is_active = false WHERE id = p_debt_id;
END;
$$;

drop function if exists "public"."generate_monthly_snapshots"();

CREATE OR REPLACE FUNCTION "public"."generate_monthly_snapshots"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start_date DATE := DATE '2021-11-01';
  v_end_date DATE := CURRENT_DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_pnl NUMERIC;
BEGIN
  FOR v_month_start IN
    SELECT date_trunc('month', dd)::DATE
    FROM generate_series(v_start_date, v_end_date, '1 month'::interval) dd
  LOOP
    -- last day of the month (or today if current month)
    IF date_trunc('month', v_month_start) = date_trunc('month', v_end_date) THEN
      v_month_end := v_end_date;
    ELSE
      v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
    END IF;

    -- Calculate PnL
    SELECT public.calculate_pnl(v_month_start, v_month_end) INTO v_pnl;

    -- Calculate expenses directly
    INSERT INTO public.monthly_snapshots (date, pnl, interest, tax, fee)
    WITH
    -- 1. Trading fees + taxes
    trading_costs AS (
      SELECT
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%fee%'), 0) AS total_fees,
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%tax%'), 0) AS total_taxes
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'expense'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    ),
    -- 2. Loan interest
    loan_interest_costs AS (
      SELECT
        COALESCE(SUM(tl.amount), 0) AS total_interest
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'repay'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    ),
    -- 3. Margin + cash advance interest
    other_interest_costs AS (
      SELECT
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Margin%'), 0) AS margin_interest,
        COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Cash advance%'), 0) AS cash_advance_interest
      FROM public.transactions t
      JOIN public.transaction_legs tl ON t.id = tl.transaction_id
      JOIN public.assets a ON tl.asset_id = a.id
      WHERE t.transaction_date BETWEEN v_month_start AND v_month_end
        AND t.type = 'expense'
        AND a.ticker IN ('EARNINGS', 'CAPITAL')
    )
    SELECT
      v_month_start,
      v_pnl,
      (lic.total_interest + oic.margin_interest + oic.cash_advance_interest) AS interest,
      tc.total_taxes,
      tc.total_fees
    FROM trading_costs tc, loan_interest_costs lic, other_interest_costs oic
    ON CONFLICT (date) DO UPDATE
      SET pnl = EXCLUDED.pnl,
          interest = EXCLUDED.interest,
          tax = EXCLUDED.tax,
          fee = EXCLUDED.fee;
  END LOOP;
END;
$$;

drop function if exists "public"."import_transactions"("jsonb", "date");

CREATE OR REPLACE FUNCTION "public"."import_transactions"("p_txn_data" "jsonb", "p_start_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_txn_record jsonb;
  v_txn_type text;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_debt_id uuid;
  v_asset_ticker text;
  v_cash_asset_ticker text;
  v_lender_name text;
BEGIN
  IF NOT jsonb_typeof(p_txn_data) = 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array of transactions.';
  END IF;

  -- Temporarily disable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions DISABLE TRIGGER USER;

  FOR v_txn_record IN SELECT * FROM jsonb_array_elements(p_txn_data)
  LOOP
    v_txn_type := v_txn_record->>'type';

    v_asset_ticker := v_txn_record->>'asset_ticker';
    IF v_asset_ticker IS NOT NULL THEN
      v_asset_id := public.get_asset_id_from_ticker(v_asset_ticker);
    END IF;

    v_cash_asset_ticker := v_txn_record->>'cash_asset_ticker';
    IF v_cash_asset_ticker IS NOT NULL THEN
      v_cash_asset_id := public.get_asset_id_from_ticker(v_cash_asset_ticker);
    END IF;

    CASE v_txn_type
      WHEN 'buy' THEN PERFORM "public"."add_buy_transaction"(
        (v_txn_record->>'date')::date,
        v_asset_id,
        v_cash_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'price')::numeric,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'sell' THEN PERFORM "public"."add_sell_transaction"(
        v_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'price')::numeric,
        (v_txn_record->>'date')::date,
        v_cash_asset_id,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'deposit' THEN PERFORM "public"."add_deposit_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'withdraw' THEN PERFORM "public"."add_withdraw_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'repay' THEN
        v_lender_name := v_txn_record->>'counterparty';
        SELECT id INTO v_debt_id
        FROM public.debts
        WHERE lender_name = v_lender_name AND is_active;
        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name;
        END IF;
        PERFORM "public"."add_repay_transaction"(
          v_debt_id,
          (v_txn_record->>'principal')::numeric,
          (v_txn_record->>'interest')::numeric,
          (v_txn_record->>'date')::date,
          v_cash_asset_id,
          v_txn_record->>'description',
          (v_txn_record->>'created_at')::timestamptz
        );
      WHEN 'income' THEN
        PERFORM "public"."add_income_transaction"(
          (v_txn_record->>'date')::date,
          (v_txn_record->>'quantity')::numeric,
          v_txn_record->>'description',
          v_cash_asset_id,
          'income',
          (v_txn_record->>'created_at')::timestamptz
        );
      WHEN 'dividend' THEN
        IF v_asset_ticker = 'EPF' THEN
          PERFORM "public"."add_income_transaction"(
            (v_txn_record->>'date')::date,
            (v_txn_record->>'quantity')::numeric,
            v_txn_record->>'description',
            v_asset_id,
            'dividend',
            (v_txn_record->>'created_at')::timestamptz
          );
        ELSE
          PERFORM "public"."add_income_transaction"(
            (v_txn_record->>'date')::date,
            (v_txn_record->>'quantity')::numeric,
            v_txn_record->>'description',
            v_cash_asset_id,
            'dividend',
            (v_txn_record->>'created_at')::timestamptz
          );
        END IF;
      WHEN 'expense' THEN PERFORM "public"."add_expense_transaction"(
        (v_txn_record->>'date')::date,
        (v_txn_record->>'quantity')::numeric,
        v_txn_record->>'description',
        v_asset_id,
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'borrow' THEN PERFORM "public"."add_borrow_transaction"(
        v_txn_record->>'counterparty',
        (v_txn_record->>'principal')::numeric,
        (v_txn_record->>'interest_rate')::numeric,
        (v_txn_record->>'date')::date,
        v_cash_asset_id,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      WHEN 'split' THEN PERFORM "public"."add_split_transaction"(
        v_asset_id,
        (v_txn_record->>'quantity')::numeric,
        (v_txn_record->>'date')::date,
        v_txn_record->>'description',
        (v_txn_record->>'created_at')::timestamptz
      );
      ELSE
        RAISE EXCEPTION 'Unknown transaction type: %', v_txn_type;
    END CASE;
  END LOOP;

  -- Re-enable all user-defined triggers on the transactions table
  ALTER TABLE public.transactions ENABLE TRIGGER USER;
  
  -- Generate the performance snapshots in a single batch
  PERFORM public.generate_performance_snapshots(p_start_date, CURRENT_DATE);
END;
$$;