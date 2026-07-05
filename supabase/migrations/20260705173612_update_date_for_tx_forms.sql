SET check_function_bodies = false;
DROP FUNCTION public.add_borrow_event(p_principal numeric, p_lender text, p_rate numeric);
DROP FUNCTION public.add_cashflow_event(p_operation text, p_asset_id uuid, p_quantity numeric, p_fx_rate numeric, p_memo text);
DROP FUNCTION public.add_repay_event(p_repay_tx uuid, p_interest numeric);
DROP FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric, p_user_id uuid);
DROP FUNCTION public.get_accrued_interest();
CREATE FUNCTION public.add_borrow_event(p_principal numeric, p_lender text, p_rate numeric, p_created_at timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare
  v_tx_id uuid;
begin
  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id, created_at)
  values (
    'borrow',
    'Borrow ' || p_principal::text || ' from ' || p_lender || ' at ' || to_char(p_rate, 'FM90.##%'),
    auth.uid(),
    COALESCE(p_created_at, now())
  )
  returning id into v_tx_id;

  -- Insert into tx_debt
  insert into public.tx_borrow (
    tx_id,
    lender,
    principal,
    rate
  )
  values (
    v_tx_id,
    p_lender,
    p_principal,
    p_rate
  );
end;$function$;
GRANT ALL ON FUNCTION public.add_borrow_event(numeric, text, numeric, timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.add_borrow_event(numeric, text, numeric, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.add_borrow_event(numeric, text, numeric, timestamp with time zone) TO service_role;
CREATE FUNCTION public.add_cashflow_event(p_operation text, p_asset_id uuid, p_quantity numeric, p_fx_rate numeric, p_memo text, p_created_at timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare
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
  insert into public.tx_entries (
    category,
    memo,
    user_id,
    created_at
  )
  values (
    'cashflow',
    p_memo,
    auth.uid(),
    COALESCE(p_created_at, now())
  )
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
end;$function$;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text, timestamp with time zone) TO service_role;
CREATE FUNCTION public.add_repay_event(p_repay_tx uuid, p_interest numeric, p_created_at timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare
  v_tx_id uuid;
  v_lender text;
  v_principal numeric;
begin
  -- Find lender name
  select b.lender into v_lender
  from public.tx_borrow b where b.tx_id = p_repay_tx;

  -- Find principal amount
  select b.principal into v_principal
  from public.tx_borrow b where b.tx_id = p_repay_tx;

  -- Insert into tx_entries
  insert into public.tx_entries (category, memo, user_id, created_at)
  values (
    'repay',
    'Repay to ' || v_lender,
    auth.uid(),
    COALESCE(p_created_at, now())
  ) returning id into v_tx_id;

  -- Insert into tx_repay
  insert into public.tx_repay (
    tx_id,
    borrow_tx,
    principal,
    interest
  )
  values (
    v_tx_id,
    p_repay_tx,
    v_principal,
    p_interest
  );
end;$function$;
GRANT ALL ON FUNCTION public.add_repay_event(uuid, numeric, timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.add_repay_event(uuid, numeric, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.add_repay_event(uuid, numeric, timestamp with time zone) TO service_role;
CREATE FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric DEFAULT 0, p_user_id uuid DEFAULT auth.uid(), p_created_at timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id uuid;
  v_stock_id uuid;
BEGIN
  SELECT a.id INTO v_stock_id
  FROM public.assets a
  WHERE a.ticker = p_ticker;

  INSERT INTO public.tx_entries (category, memo, user_id, created_at)
  VALUES (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text,
    p_user_id,
    COALESCE(p_created_at, now())
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.tx_stock (tx_id, operation, stock_id, price, quantity, fee, tax)
  VALUES (v_tx_id, p_side::stock_ops, v_stock_id, p_price, p_quantity, p_fee, COALESCE(p_tax, 0));
END;
$function$;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid, timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid, timestamp with time zone) TO service_role;
CREATE VIEW public.outstanding_debts WITH (security_invoker=true) AS SELECT b.tx_id,
    b.lender,
    b.principal,
    b.rate,
    round(((b.principal * power(((1)::numeric + ((b.rate / 100.0) / 365.0)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - e.created_at)))) - b.principal), 0) AS accrued_interest,
    e.created_at
   FROM (public.tx_borrow b
     JOIN public.tx_entries e ON (((e.id = b.tx_id) AND (e.user_id = auth.uid()))))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.tx_repay r
          WHERE (r.borrow_tx = b.tx_id))));
CREATE OR REPLACE VIEW public.balance_sheet WITH (security_invoker=true) AS WITH user_legs AS (
         SELECT tl.tx_id,
            tl.asset_id,
            tl.quantity,
            tl.debit,
            tl.credit
           FROM (public.tx_legs tl
             JOIN public.tx_entries e ON ((e.id = tl.tx_id)))
          WHERE (e.user_id = auth.uid())
        ), debt_interest AS (
         SELECT sum(outstanding_debts.accrued_interest) AS sum
           FROM public.outstanding_debts
        )
 SELECT a.ticker,
    a.name,
    a.asset_class,
    a.logo_url,
    a.currency_code,
    COALESCE(sum(ul.quantity), (0)::numeric) AS quantity,
    COALESCE((sum(ul.debit) - sum(ul.credit)), (0)::numeric) AS cost_basis,
        CASE
            WHEN (a.asset_class = ANY (ARRAY['stock'::public.asset_class, 'fund'::public.asset_class])) THEN round(sum((ul.quantity * COALESCE(sp.price, er.rate))), 0)
            WHEN (a.ticker = 'INTERESTS'::text) THEN ( SELECT sum(outstanding_debts.accrued_interest) AS sum
               FROM public.outstanding_debts)
            ELSE sum(ul.quantity)
        END AS total_value,
    COALESCE(COALESCE(sp.price, er.rate), (0)::numeric) AS mkt_price,
    COALESCE(
        CASE
            WHEN (a.ticker = 'INTERESTS'::text) THEN (- ( SELECT sum(outstanding_debts.accrued_interest) AS sum
               FROM public.outstanding_debts))
            ELSE round((sum((ul.quantity * COALESCE(sp.price, er.rate))) - (sum(ul.debit) - sum(ul.credit))), 0)
        END, (0)::numeric) AS net_profit
   FROM (((public.assets a
     LEFT JOIN user_legs ul ON ((a.id = ul.asset_id)))
     LEFT JOIN LATERAL ( SELECT (hp.close * (1000)::numeric) AS price
           FROM public.historical_prices hp
          WHERE (hp.asset_id = a.id)
          ORDER BY hp.date DESC
         LIMIT 1) sp ON (true))
     LEFT JOIN LATERAL ( SELECT hfx.rate
           FROM public.historical_fxrate hfx
          WHERE (hfx.currency_code = a.currency_code)
          ORDER BY hfx.date DESC
         LIMIT 1) er ON (true))
  GROUP BY a.ticker, a.name, a.logo_url, a.currency_code, a.asset_class, sp.price, er.rate
 HAVING ((abs(sum(ul.quantity)) > (0)::numeric) OR (a.ticker = 'INTERESTS'::text))
  ORDER BY a.asset_class;
GRANT ALL ON public.outstanding_debts TO anon;
GRANT ALL ON public.outstanding_debts TO authenticated;
GRANT ALL ON public.outstanding_debts TO service_role;
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
