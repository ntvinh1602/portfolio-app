alter table public.debts
add column is_active boolean not null default true;

alter table public.debts
drop column status;

CREATE OR REPLACE FUNCTION "public"."add_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_debts_asset_id uuid;
  v_transaction_id uuid;
  v_debt_id uuid;
BEGIN
  -- 1. Get debts asset
  v_debts_asset_id := public.get_asset_id_from_ticker(p_user_id, 'DEBTS');
  
  -- 2. Create the debt record
  INSERT INTO public.debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, is_active)
  VALUES (
    p_user_id,
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    p_transaction_date,
    true
  ) RETURNING id INTO v_debt_id;

  -- 3. Create the transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'borrow',
    p_description,
    v_debt_id,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Create the transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES
    -- Debit the deposit account (increase cash)
    (v_transaction_id,
    p_cash_asset_id,
    p_principal_amount,
    p_principal_amount,
    'VND'),
    -- Credit the Debts Principal account (increase liability)
    (v_transaction_id,
    v_debts_asset_id,
    p_principal_amount * -1,
    p_principal_amount * -1,
    'VND');
END;
$$;

CREATE OR REPLACE FUNCTION "public"."add_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_cash_asset_id" "uuid", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
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
  v_debts_asset_id := public.get_asset_id_from_ticker(p_user_id, 'DEBTS');
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Calculate the total payment amount
  v_total_payment := p_principal_payment + p_interest_payment;

  -- 3. Create a new transactions record
  INSERT INTO public.transactions (user_id, transaction_date, type, description, related_debt_id, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'debt_payment',
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
  p_principal_payment,
  p_principal_payment,
  'VND'),
  -- Debit: Decrease Owner Capital for interest portion
  (v_transaction_id,
  v_owner_capital_asset_id,
  p_interest_payment,
  p_interest_payment,
  'VND');

  -- 5. Mark the debt as paid
  UPDATE public.debts SET is_active = false WHERE id = p_debt_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_active_debts"("p_user_id" "uuid") RETURNS SETOF "public"."debts"
  LANGUAGE "sql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
SELECT * FROM public.debts WHERE is_active AND user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION "public"."get_asset_summary"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
  -- Cost basis values
  asset_cb_by_class jsonb;
  total_assets_cb numeric;
  
  -- Market value values
  asset_mv_by_class jsonb;
  total_assets_mv numeric;
  
  -- Liability values
  debts_principal numeric;
  accrued_interest numeric;
  liability_total numeric;
  
  -- Equity values
  owner_capital numeric;
  unrealized_pl numeric;
  equity_total numeric;
BEGIN
  -- Calculate cost basis totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(cb_totals.asset_class, cb_totals.total), '{}'::jsonb)
  INTO asset_cb_by_class
  FROM (
    SELECT s.asset_class, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as cb_totals;
  -- Calculate market value totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(mv_totals.asset_class, mv_totals.total), '{}'::jsonb)
  INTO asset_mv_by_class
  FROM (
    SELECT
      s.asset_class,
      SUM(
        CASE
          WHEN s.asset_class = 'stock' THEN a.current_quantity * COALESCE(public.get_latest_stock_price(s.id), 0)
          WHEN s.asset_class = 'crypto' THEN a.current_quantity * COALESCE(public.get_latest_crypto_price(s.id), 0) * COALESCE(public.get_latest_exchange_rate('USD'), 1)
          ELSE a.current_quantity * COALESCE(public.get_latest_exchange_rate(s.currency_code), 1)
        END
      ) AS total
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as mv_totals;
  -- Calculate total asset cost basis
  total_assets_cb := (coalesce((asset_cb_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'crypto')::numeric, 0));
  -- Calculate total asset market value
  total_assets_mv := (coalesce((asset_mv_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'crypto')::numeric, 0));
  -- Calculate liability values
  SELECT a.current_quantity * -1 INTO debts_principal
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'DEBTS' AND a.user_id = p_user_id;
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM debts d
  WHERE d.user_id = p_user_id AND d.is_active;
  liability_total := debts_principal + accrued_interest;
  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  unrealized_pl := total_assets_mv - total_assets_cb - accrued_interest;
  equity_total := owner_capital + unrealized_pl;
  
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_mv_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_mv_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_mv_by_class->>'epf')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_mv_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', total_assets_mv,
    'liabilities', json_build_array(
      json_build_object('type', 'Debts Principal', 'totalAmount', debts_principal),
      json_build_object('type', 'Accrued Interest', 'totalAmount', accrued_interest)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Owner Capital', 'totalAmount', owner_capital),
      json_build_object('type', 'Unrealized P/L', 'totalAmount', unrealized_pl)
    ),
    'totalEquity', equity_total
  ) INTO result;
  RETURN result;
END;
$$;

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
          AND is_active;
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

CREATE OR REPLACE FUNCTION "public"."update_assets_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update all assets linked to the inserted transaction
  UPDATE public.assets a
  SET current_quantity = CASE
      WHEN s.ticker = 'INTERESTS' THEN COALESCE((
          SELECT SUM(
            d.principal_amount *
            (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)
          )
          FROM public.debts d
          WHERE d.user_id = a.user_id AND d.is_active
      ), 0)
      ELSE COALESCE((
          SELECT SUM(quantity)
          FROM public.transaction_legs tl
          WHERE tl.asset_id = a.id
      ), 0)
  END
  FROM public.securities s
  WHERE a.security_id = s.id;
  RETURN NULL;
END;
$$;