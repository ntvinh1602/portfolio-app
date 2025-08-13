drop function if exists "public"."handle_deposit_transaction"("uuid", "date", "uuid", numeric, "text", "uuid", timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."add_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_created_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_owner_capital_asset_id UUID;
  v_transaction_id UUID;
  v_response JSONB;
  v_calculated_amount numeric;
  v_asset_currency text;
  v_exchange_rate numeric;
BEGIN
  -- 1. Get asset details
  -- Get asset currency
  v_asset_currency := public.get_asset_currency(p_user_id, p_asset_id);
  -- Get Owner Capital asset
  v_owner_capital_asset_id := public.get_asset_id_from_ticker(p_user_id, 'CAPITAL');
  
  -- 2. Calculate the amount
  IF v_asset_currency = 'VND' THEN v_calculated_amount := p_quantity;
  ELSE
    -- Correctly fetch the historical exchange rate
    SELECT rate INTO v_exchange_rate
    FROM public.daily_exchange_rates
    WHERE currency_code = v_asset_currency AND date <= p_transaction_date
    ORDER BY date DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL THEN
      RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency, p_transaction_date;
    END IF;
    v_calculated_amount := p_quantity * v_exchange_rate;
  END IF;

  -- 3. Create transaction
  INSERT INTO public.transactions (user_id, transaction_date, type, description, created_at)
  VALUES (
    p_user_id,
    p_transaction_date,
    'deposit',
    p_description,
    p_created_at
  ) RETURNING id INTO v_transaction_id;

  -- 4. Create transaction legs
  INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
  VALUES
    -- Debit cash
    (v_transaction_id,
    p_asset_id,
    p_quantity,
    v_calculated_amount,
    v_asset_currency),
    -- Credit paid-in equity
    (v_transaction_id,
    v_owner_capital_asset_id,
    v_calculated_amount * -1,
    v_calculated_amount * -1,
    'VND');

  -- 5. Create tax lot for non-VND cash assets
  IF v_asset_currency != 'VND' THEN
    INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (
      p_user_id,
      p_asset_id,
      v_transaction_id,
      'deposit',
      p_transaction_date,
      p_quantity,
      p_quantity,
      v_calculated_amount
    );
  END IF;
  v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
  RETURN v_response;
  EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;