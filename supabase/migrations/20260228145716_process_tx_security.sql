CREATE OR REPLACE FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r tx_stock%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_stock_asset uuid;
  v_new_qty numeric;
  v_new_avg_cost numeric;
  v_realized_gain numeric := 0;
  v_cost_basis numeric := 0;
begin
  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  v_stock_asset := r.stock_id;

  -- Fetch or initialize position
  select * into v_pos from public.asset_positions where asset_id = r.stock_id;
  if not found then
    insert into public.asset_positions (asset_id, quantity, average_cost)
    values (r.stock_id, 0, 0)
    returning * into v_pos;
  end if;

  -- Process transaction
  if r.side = 'buy' then
    v_new_qty := v_pos.quantity + r.quantity;
    v_new_avg_cost :=
      case
        when v_new_qty = 0 then 0
        else (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty
      end;

    update public.asset_positions
    set quantity = v_new_qty,
      average_cost = v_new_avg_cost
    where asset_id = r.stock_id;

    -- Generate ledger for BUY
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit stock (increase holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, r.quantity, r.net_proceed, 0);

    -- Credit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  else -- Sell side
    if v_pos.quantity < r.quantity then
      raise exception 'Not enough shares to sell for stock %', r.stock_id;
    end if;

    v_cost_basis := v_pos.average_cost * r.quantity;
    v_realized_gain := r.net_proceed - v_cost_basis;

    update public.asset_positions
    set quantity = v_pos.quantity - r.quantity
    where asset_id = r.stock_id;

    -- Generate ledger for SELL
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit stock (reduce holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, -r.quantity, 0, v_cost_basis);

    -- Post gain/loss to equity
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (
      r.tx_id,
      v_equity_asset,
      v_realized_gain,
      GREATEST(-v_realized_gain, 0), -- Debit equity when negative realized gain
      GREATEST(v_realized_gain, 0) -- Credit equity when positive realized gain
    );
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."process_tx_cashflow"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r tx_cashflow%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_cash_currency text;
  v_new_qty numeric;
  v_new_avg_cost numeric;
BEGIN
  -- Load transaction
  SELECT * INTO r FROM public.tx_cashflow WHERE tx_id = p_tx_id;

  -- Identify assets
  v_cash_asset := r.asset_id;
  SELECT currency_code INTO v_cash_currency FROM public.assets WHERE id = v_cash_asset;
  SELECT id INTO v_equity_asset FROM public.assets WHERE ticker = 'CAPITAL';

  -- Clear existing legs
  DELETE FROM public.tx_legs WHERE tx_id = p_tx_id;

  -- Handle by operation type
  IF r.operation IN ('deposit', 'income') THEN
    -- Debit cash
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_cash_asset, r.quantity, r.net_proceed, 0);

    -- Credit equity (capital in)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, r.net_proceed, 0, r.net_proceed);

    -- Only update cost basis for non-VND assets
    IF v_cash_currency <> 'VND' THEN
      SELECT * INTO v_pos FROM public.asset_positions WHERE asset_id = v_cash_asset;
      IF NOT FOUND THEN
        INSERT INTO public.asset_positions (asset_id, quantity, average_cost)
        VALUES (v_cash_asset, 0, 0)
        RETURNING * INTO v_pos;
      END IF;

      v_new_qty := v_pos.quantity + r.quantity;
      v_new_avg_cost := (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty;

      UPDATE public.asset_positions
      SET quantity = v_new_qty,
        average_cost = v_new_avg_cost
      WHERE asset_id = v_cash_asset;
    END IF;

  ELSE -- Withdraw and expense operation
    -- Credit cash (reduce balance)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_cash_asset, -r.quantity, 0, r.net_proceed);

    -- Debit equity (capital out)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, -r.net_proceed, r.net_proceed, 0);

    -- Only update positions for non-VND
    IF v_cash_currency <> 'VND' THEN
        SELECT * INTO v_pos FROM public.asset_positions WHERE asset_id = v_cash_asset;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'No position found for asset %, cannot withdraw', v_cash_asset;
        END IF;

        IF v_pos.quantity < r.quantity THEN
          RAISE EXCEPTION 'Not enough balance to withdraw %', r.tx_id;
        END IF;

        UPDATE public.asset_positions
        SET quantity = v_pos.quantity - r.quantity
        WHERE asset_id = v_cash_asset;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r tx_debt%rowtype;
  v_cash_asset uuid;
  v_debt_asset uuid;
  v_equity_asset uuid;
begin
  -- Load transaction
  select * into r from public.tx_debt where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker = 'FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  select id into v_debt_asset from public.assets where ticker = 'DEBTS';

  -- Clear any prior legs for this transaction
  delete from public.tx_legs where tx_id = p_tx_id;

  -- Process operation type
  if r.operation = 'borrow' then
    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit debt
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, r.net_proceed, 0, r.net_proceed);

  else -- Repay operation
    -- Credit cash (payment)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

    -- Debit debt (liability reduced)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, -r.principal, r.principal, 0);

    -- Debit equity (interest expense)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_equity_asset, -r.interest, r.interest, 0);
  end if;
end;
$$;