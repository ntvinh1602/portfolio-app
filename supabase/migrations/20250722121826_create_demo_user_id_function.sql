create or replace function demo_user_id()
returns uuid language sql as $$
  select '519fcecb-2177-4978-a8d1-086a53b7ac23'::uuid
$$;

alter policy "Users can manage their own debts"
on "public"."debts"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

create policy "Guests can read demo user debts"
on "public"."debts"
for select
to anon
using (user_id = demo_user_id())