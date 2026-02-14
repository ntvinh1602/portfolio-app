drop function if exists public.add_borrow_event(text, numeric, text, numeric);

CREATE OR REPLACE FUNCTION public.add_borrow_event(p_principal numeric, p_lender text, p_rate numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_tx_id uuid;
begin
  -- Insert into tx_entries
  insert into public.tx_entries (category, memo)
  values (
    'debt',
    'Borrow ' || p_principal::text || ' from ' || p_lender || ' at ' || to_char(p_rate, 'FM90.##%')
  )
  returning id into v_tx_id;

  -- Insert into tx_cashflow
  insert into public.tx_debt (
    tx_id,
    operation,
    principal,
    lender,
    rate
  )
  values (
    v_tx_id,
    'borrow',
    p_principal,
    p_lender,
    p_rate
  );
end;
$$;