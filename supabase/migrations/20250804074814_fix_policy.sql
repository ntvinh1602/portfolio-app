drop policy if exists "Authenticated users can access own accounts or demo accounts" on "public"."accounts";

create policy "Users can access their accounts"
on "public"."accounts"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access own assets or demo assets" on "public"."assets";

create policy "Users can access their assets"
on "public"."assets"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access their own or demo performance sn" on "public"."daily_performance_snapshots";

create policy "Users can access their performance snapshots"
on "public"."daily_performance_snapshots"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access their own or demo debts" on "public"."debts";

create policy "Users can access their debts"
on "public"."debts"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access their own or demo lot consumptio" on "public"."lot_consumptions";

create policy "Users can access their lot consumptions"
on "public"."lot_consumptions"
to authenticated
using ((SELECT auth.uid() AS uid) = (SELECT tax_lots.user_id
  FROM tax_lots
  WHERE (tax_lots.id = lot_consumptions.tax_lot_id)));

drop policy if exists "Authenticated users can access their own profile or demo profil" on "public"."profiles";

create policy "Users can access their profiles"
on "public"."debts"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access their own or demo tax lots" on "public"."tax_lots";

create policy "Users can access their tax lots"
on "public"."tax_lots"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

drop policy if exists "Authenticated users can access details for their own or demo tr" on "public"."transaction_details";

create policy "Users can access their transaction details"
on "public"."transaction_details"
to authenticated
using ((SELECT auth.uid() AS uid) = (SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_details.transaction_id)));

drop policy if exists "Authenticated users can access their own or demo transaction_le" on "public"."transaction_legs";

create policy "Users can access their transaction legs"
on "public"."transaction_legs"
to authenticated
using ((SELECT auth.uid() AS uid) = (SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_legs.transaction_id)));

drop policy if exists "Authenticated users can access their own or demo transactions" on "public"."transactions";

create policy "Users can access their transactions"
on "public"."transactions"
to authenticated
using (( SELECT auth.uid() AS uid) = user_id);

  



















