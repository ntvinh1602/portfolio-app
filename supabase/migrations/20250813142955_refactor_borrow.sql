drop function if exists "public"."handle_borrow_transaction"("uuid", "text", numeric, numeric, "date", "uuid", "uuid", "text", timestamp with time zone);

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
  INSERT INTO public.debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
  VALUES (
    p_user_id,
    p_lender_name,
    p_principal_amount,
    'VND',
    p_interest_rate,
    p_transaction_date,
    'active'
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