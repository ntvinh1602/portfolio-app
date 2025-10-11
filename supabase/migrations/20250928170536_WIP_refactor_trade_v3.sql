CREATE OR REPLACE FUNCTION public.is_base_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assets a
    WHERE a.id = p_asset_id
      AND a.asset_class = 'cash'
      AND a.currency_code = 'VND'
  );
$$;


CREATE OR REPLACE FUNCTION "public"."add_buy_transaction"(
  "p_txn_date" "date",
  "p_to_asset_id" "uuid",
  "p_from_asset_id" "uuid",
  "p_to_quantity" numeric,
  "p_from_quantity" numeric,
  "p_description" "text",
  "p_created_at" timestamp with time zone DEFAULT "now"()
) RETURNS "uuid"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_txn_id uuid;
  v_from_asset_currency text;
  v_to_asset_currency text;
  v_from_asset_fx_rate numeric;
  v_to_asset_cost_basis numeric; -- in VND

  -- FX Gain/Loss variables
  v_from_asset_cost_basis_spent numeric := 0; -- in VND
  v_realized_pnl numeric;
  v_remaining_quantity_to_spend numeric;
  v_lot record;
  v_quantity_from_lot numeric;
  v_cost_basis_from_lot numeric;
  v_from_asset_leg_id uuid;
  v_capital_asset_id uuid;
BEGIN
  -- 1. Get meta data
  v_capital_asset_id := public.get_asset_id_from_ticker('CAPITAL');
  v_to_asset_currency := public.get_asset_currency(p_to_asset_id);
  v_from_asset_currency := public.get_asset_currency(p_from_asset_id);

  -- 2. Calculate from quantity
  p_price_in_from_unit := p_from_quantity / p_to_quantity;

  -- 3. Create transaction
  INSERT INTO public.transactions (transaction_date, type, description, price, created_at)
  VALUES (
    p_txn_date,
    'buy',
    p_description,
    p_price_in_from_unit,
    p_created_at
  ) RETURNING id INTO v_txn_id;

  -- 4. Calculate gain/loss if from asset has cost basis
  IF NOT public.is_base_asset(p_from_asset_id) THEN
    -- Get exchange rate
    v_from_asset_fx_rate := public.get_fx_rate(v_from_asset_currency, p_txn_date)
    
    v_to_asset_cost_basis := p_from_quantity * v_from_asset_fx_rate;
    -- Consume tax lots of the from asset
    v_remaining_quantity_to_spend := p_from_quantity;
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric) ON COMMIT DROP;
    FOR v_lot IN
      SELECT * FROM public.tax_lots
      WHERE asset_id = p_from_asset_id AND remaining_quantity > 0
      ORDER BY creation_date ASC
    LOOP
      IF v_remaining_quantity_to_spend <= 0 THEN EXIT;
      END IF;
      v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
      v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
      UPDATE public.tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
      INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
      v_from_asset_cost_basis_spent := v_from_asset_cost_basis_spent + v_cost_basis_from_lot;
      v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_spend > 0 THEN
      RAISE EXCEPTION 'Not enough cash for purchase. Tried to spend %, but only % was available.', p_from_quantity, (p_from_quantity - v_remaining_quantity_to_spend);
    END IF;
    -- Calculate realized gain/loss
    v_realized_pnl := v_to_asset_cost_basis - v_from_asset_cost_basis_spent;
    -- Create transaction legs
    -- Credit the from asset at its cost basis
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_txn_id,
      p_from_asset_id,
      p_from_quantity * -1,
      v_from_asset_cost_basis_spent * -1,
      v_from_asset_currency
    )
    RETURNING id INTO v_from_asset_leg_id;
    -- Debit the to asset
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES (
      v_txn_id,
      p_to_asset_id,
      p_to_quantity,
      v_to_asset_cost_basis,
      v_to_asset_currency
    );
    -- Credit/Debit Owner Capital with the realized FX gain/loss
    IF v_realized_pnl != 0 THEN
      INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
      VALUES (
        v_txn_id,
        v_capital_asset_id,
        v_realized_pnl * -1,
        v_realized_pnl * -1,
        'VND'
      );
    END IF;
    -- Create lot consumptions
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
      INSERT INTO public.lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
      VALUES (v_from_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;
  -- Standard buy logic if from asset is VND
  ELSE
    v_to_asset_cost_basis := p_from_quantity;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, asset_id, quantity, amount, currency_code)
    VALUES
      -- Credit from asset' 
      (v_txn_id,
      p_from_asset_id,
      p_from_quantity * -1,
      v_to_asset_cost_basis * -1,
      v_from_asset_currency),
      -- Debit to asset
      (v_txn_id,
      p_to_asset_id,
      p_to_quantity,
      v_to_asset_cost_basis,
      v_to_asset_currency);
  END IF;
  
  -- 5. Create tax lot for the to asset
  INSERT INTO public.tax_lots (asset_id, creation_transaction_id, creation_date, original_quantity, remaining_quantity, cost_basis)
  VALUES (
    p_to_asset_id,
    v_txn_id,
    p_txn_date,
    p_to_quantity,
    p_to_quantity,
    v_to_asset_cost_basis
  );
  RETURN v_txn_id;
END;
$$;