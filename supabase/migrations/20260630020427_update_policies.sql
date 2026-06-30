drop policy "Auth users can insert into refresh_queue" on "public"."refresh_queue";

drop policy "Auth users can read refresh_queue" on "public"."refresh_queue";

drop policy "Auth users can read tx_cashflow" on "public"."tx_cashflow";

drop policy "Auth users can read tx_debt" on "public"."tx_debt";

drop policy "Enable insert for authenticated users only" on "public"."tx_entries";

drop policy "Auth users can read tx_legs" on "public"."tx_legs";

drop policy "Auth users can read tx_stock" on "public"."tx_stock";


  create policy "Users can read own cashflow txs"
  on "public"."tx_cashflow"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_cashflow.tx_id) AND (e.user_id = auth.uid())))));



  create policy "Users can read own debt txs"
  on "public"."tx_debt"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_debt.tx_id) AND (e.user_id = auth.uid())))));



  create policy "Enable insert for users based on user_id"
  on "public"."tx_entries"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can read own legs"
  on "public"."tx_legs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_legs.tx_id) AND (e.user_id = auth.uid())))));



  create policy "Users can read own stock txs"
  on "public"."tx_stock"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.tx_entries e
  WHERE ((e.id = tx_stock.tx_id) AND (e.user_id = auth.uid())))));



