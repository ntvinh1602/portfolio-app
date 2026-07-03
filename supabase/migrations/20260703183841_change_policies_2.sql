SET check_function_bodies = false;
DROP POLICY "Enable insert for authenticated users only" ON public.historical_fxrate;
DROP POLICY "Enable read access for all users" ON public.historical_fxrate;
DROP POLICY "Enable update for authenticated users only" ON public.historical_fxrate;
DROP POLICY "Enable insert for authenticated users only" ON public.historical_prices;
DROP POLICY "Enable read access for all users" ON public.historical_prices;
DROP POLICY "Enable update for authenticated users only" ON public.historical_prices;
DROP POLICY "Enable insert for authenticated users only" ON public.tx_borrow;
DROP POLICY "Enable insert for authenticated users only" ON public.tx_cashflow;
DROP POLICY "Enable insert for authenticated users only" ON public.tx_legs;
DROP POLICY "Enable insert for authenticated users only" ON public.tx_repay;
DROP POLICY "Enable insert for authenticated users only" ON public.tx_stock;
CREATE OR REPLACE FUNCTION public.add_repay_event(p_repay_tx uuid, p_interest numeric)
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
  insert into public.tx_entries (category, memo, user_id)
  values (
    'repay',
    'Repay to ' || v_lender,
    auth.uid()
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

  -- Change borrow record to paid
  update public.tx_borrow
  set is_paid = true
  where tx_id = p_repay_tx;
end;$function$;
CREATE OR REPLACE FUNCTION public.add_stock_event(p_side text, p_ticker text, p_price numeric, p_quantity numeric, p_fee numeric, p_tax numeric DEFAULT 0, p_user_id uuid DEFAULT auth.uid())
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
  v_tx_id uuid;
  v_stock_id uuid;
BEGIN
  -- Find stock id
  SELECT a.id
    INTO v_stock_id
  FROM public.assets a
  WHERE a.ticker = p_ticker;

  -- Insert into tx_entries
  INSERT INTO public.tx_entries (category, memo, user_id)
  VALUES (
    'stock',
    initcap(p_side) || ' ' || p_quantity::text || ' ' || p_ticker || ' at ' || p_price::text,
    p_user_id
  )
  RETURNING id INTO v_tx_id;

  -- Insert into tx_stock
  INSERT INTO public.tx_stock (
    tx_id,
    operation,
    stock_id,
    price,
    quantity,
    fee,
    tax
  )
  VALUES (
    v_tx_id,
    p_side::stock_ops,
    v_stock_id,
    p_price,
    p_quantity,
    p_fee,
    COALESCE(p_tax, 0)
  );
END;$function$;
CREATE POLICY "Enable read access for authenticated users only" ON public.historical_fxrate FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users only" ON public.historical_prices FOR SELECT TO authenticated USING (true);
ALTER TABLE public.tx_borrow ADD COLUMN is_paid boolean DEFAULT false NOT NULL;
CREATE POLICY "Enable users to insert their own borrow txs" ON public.tx_borrow FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_borrow.tx_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Users can update their own borrow txs" ON public.tx_borrow FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_borrow.tx_id) AND (e.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_borrow.tx_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Enable users to insert their own cashflow txs" ON public.tx_cashflow FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_cashflow.tx_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Enable users to insert their own tx legs" ON public.tx_legs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_legs.tx_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Enable users to insert their own repay txs" ON public.tx_repay FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_repay.tx_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Enable users to insert their own stock txs" ON public.tx_stock FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_stock.tx_id) AND (e.user_id = auth.uid())))));
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
ALTER POLICY "Enable insert for users based on user_id" ON public.tx_entries TO authenticated;
