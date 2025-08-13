drop function if exists "public"."handle_split_transaction"("uuid", "uuid", numeric, "date", "text", timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."add_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_transaction_id UUID;
  v_owner_capital_asset_id UUID;
  v_asset_currency TEXT;
BEGIN
  -- 1. Get assets information
  -- Get currency code for asset
  v_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');

  -- 2. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at) VALUES (
    p_user_id,
    p_transaction_date,
    'split',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 3. Create transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code) VALUES
    -- Debit asset
    (v_transaction_id,
    p_asset_id,
    p_quantity,
    0,
    v_asset_currency),
    -- Credit owner capital
    (v_transaction_id,
    v_owner_capital_asset_id,
    0,
    0,
    'VND');

  -- 4. Create tax lots
  INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (
    p_user_id,
    p_asset_id,
    v_transaction_id,
    'split',
    p_transaction_date,
    p_quantity,
    p_quantity,
    0
  );
END;
$$;