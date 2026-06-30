drop policy "Enable users to view their own data only" on "public"."asset_positions";

revoke delete on table "public"."asset_positions" from "anon";

revoke insert on table "public"."asset_positions" from "anon";

revoke references on table "public"."asset_positions" from "anon";

revoke select on table "public"."asset_positions" from "anon";

revoke trigger on table "public"."asset_positions" from "anon";

revoke truncate on table "public"."asset_positions" from "anon";

revoke update on table "public"."asset_positions" from "anon";

revoke delete on table "public"."asset_positions" from "authenticated";

revoke insert on table "public"."asset_positions" from "authenticated";

revoke references on table "public"."asset_positions" from "authenticated";

revoke select on table "public"."asset_positions" from "authenticated";

revoke trigger on table "public"."asset_positions" from "authenticated";

revoke truncate on table "public"."asset_positions" from "authenticated";

revoke update on table "public"."asset_positions" from "authenticated";

revoke delete on table "public"."asset_positions" from "service_role";

revoke insert on table "public"."asset_positions" from "service_role";

revoke references on table "public"."asset_positions" from "service_role";

revoke select on table "public"."asset_positions" from "service_role";

revoke trigger on table "public"."asset_positions" from "service_role";

revoke truncate on table "public"."asset_positions" from "service_role";

revoke update on table "public"."asset_positions" from "service_role";

alter table "public"."asset_positions" drop constraint "asset_positions_user_id_fkey";

alter table "public"."asset_positions" drop constraint "stock_positions_stock_id_fkey";

alter table "public"."asset_positions" drop constraint "asset_positions_pkey";

drop index if exists "public"."asset_positions_pkey";

drop table "public"."asset_positions";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.process_tx_cashflow(p_tx_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  r tx_cashflow%rowtype;
  v_equity_asset uuid;
  v_user_id uuid;
  v_current_qty numeric;
  v_cost_change numeric;
  v_realized_pnl numeric;
  v_current_cost numeric;
BEGIN
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  -- Load transaction
  SELECT * INTO r FROM public.tx_cashflow WHERE tx_id = p_tx_id;

  -- Identify assets
  SELECT id INTO v_equity_asset FROM public.assets WHERE ticker = 'CAPITAL';

  -- Clear existing legs
  DELETE FROM public.tx_legs WHERE tx_id = p_tx_id;

  -- Handle by operation type
  IF r.operation IN ('deposit', 'income') THEN
    -- Debit cash asset
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, r.asset_id, r.quantity, r.net_proceed, 0);

    -- Credit equity (capital in)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, v_equity_asset, r.net_proceed, 0, r.net_proceed);

  ELSE -- Withdraw and expense operation

    -- Calculate current total cost & quantity
    SELECT SUM(l.debit) - SUM(l.credit), SUM(l.quantity)
    INTO v_current_cost, v_current_qty
    FROM public.tx_legs l
      JOIN public.tx_entries e ON l.tx_id = e.id
    WHERE l.asset_id = r.asset_id AND e.user_id = v_user_id;

    v_cost_change := r.quantity * v_current_cost / v_current_qty;
    v_realized_pnl := r.net_proceed - v_cost_change;

    -- Credit cash asset (reduce balance)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (r.tx_id, r.asset_id, -r.quantity, 0, v_cost_change);

    -- Debit equity (capital out & possible gain/loss to equity)
    INSERT INTO public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    VALUES (
      r.tx_id,
      v_equity_asset,
      -v_cost_change,
      r.net_proceed + GREATEST(-v_realized_pnl, 0),
      0 + GREATEST(v_realized_pnl, 0)
    );
  END IF;
END;$function$
;

CREATE OR REPLACE FUNCTION public.process_tx_stock(p_tx_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  r tx_stock%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_realized_pnl numeric;
  v_cost_change numeric;
  v_user_id uuid;
  v_current_cost numeric;
  v_current_qty numeric;
begin
  -- Derive user_id from tx_entries (works for both trigger and rebuild_ledger paths)
  SELECT e.user_id INTO v_user_id
  FROM public.tx_entries e
  WHERE e.id = p_tx_id;

  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';

  -- Process transaction
  if r.operation = 'buy' then

    -- Debit stock (increase holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, r.stock_id, r.quantity, r.net_proceed, 0);

    -- Credit VND cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  else -- Sell side

    -- Calculate current total cost & quantity
    SELECT SUM(l.debit) - SUM(l.credit), SUM(l.quantity)
    INTO v_current_cost, v_current_qty
    FROM public.tx_legs l
      JOIN public.tx_entries e ON l.tx_id = e.id
    WHERE l.asset_id = r.stock_id AND e.user_id = v_user_id;

    v_cost_change := r.quantity * v_current_cost / v_current_qty;
    v_realized_pnl := r.net_proceed - v_cost_change;

    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit stock (reduce holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, r.stock_id, -r.quantity, 0, v_cost_change);

    -- Post gain/loss to equity
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (
      r.tx_id,
      v_equity_asset,
      v_realized_pnl,
      GREATEST(-v_realized_pnl, 0),
      GREATEST(v_realized_pnl, 0)
    );
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.rebuild_ledger()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
    tx record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;

    -- Step 2: replay all transactions in chronological order
    for tx in
        select id, category, created_at
        from public.tx_entries
        order by created_at asc
    loop
        if tx.category = 'stock' then
            perform public.process_tx_stock(tx.id);

        elsif tx.category = 'cashflow' then
            perform public.process_tx_cashflow(tx.id);

        elsif tx.category = 'borrow' then
            perform public.process_tx_borrow(tx.id);

        elsif tx.category = 'repay' then
            perform public.process_tx_repay(tx.id);

        else
            raise notice 'Skipping unknown category % for id %', tx.category, tx.id;
        end if;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;$function$
;


