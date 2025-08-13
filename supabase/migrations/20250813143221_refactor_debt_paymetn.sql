drop function if exists "public"."handle_debt_payment_transaction"("uuid", "uuid", numeric, numeric, "date", "uuid", "uuid", "text", timestamp with time zone);

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

-- 4. Create the transaction legs
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
  UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
END;
$$;