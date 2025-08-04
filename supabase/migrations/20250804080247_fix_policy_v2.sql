drop policy if exists "Users can access their profiles" on "public"."debts";

create policy "Users can access their profiles"
on "public"."profiles"
to authenticated
using (( SELECT auth.uid() AS uid) = id);
