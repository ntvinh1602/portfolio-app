CREATE OR REPLACE FUNCTION "public"."add_cashflow_event"("p_operation" "text", "p_asset_id" "uuid", "p_quantity" numeric, "p_fx_rate" numeric, "p_memo" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx_id uuid;
  v_asset_currency text;
  v_fx_rate numeric;
begin
  -- Find asset currency
  select a.currency_code into v_asset_currency
  from public.assets a
  where a.id = p_asset_id;

  -- Determine FX rate
  if v_asset_currency = 'VND' then v_fx_rate := 1;
  else v_fx_rate := coalesce(p_fx_rate, 1);
  end if;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo)
  values ('cashflow', p_memo)
  returning id into v_tx_id;

  -- Insert into tx_cashflow
  insert into public.tx_cashflow (
    tx_id,
    asset_id,
    operation,
    quantity,
    fx_rate
  )
  values (
    v_tx_id,
    p_asset_id,
    p_operation::cashflow_ops,
    p_quantity,
    v_fx_rate
  );
end;
$$;