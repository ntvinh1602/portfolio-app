alter policy "Users can manage their own tax lots"
on "public"."tax_lots"
to authenticated
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user tax lots"
on "public"."tax_lots"
for select
to anon
using (user_id = demo_user_id());

alter policy "Authenticated users can read securities"
on "public"."securities"
to authenticated
using (true);

drop policy "Service role can manage revalidation queue"
on "public"."revalidation_queue";

drop policy "Authenticated users can insert into revalidation_queue"
on "public"."revalidation_queue";

create policy "Users can insert into revalidation_queue"
on "public"."revalidation_queue"
to authenticated
with check (
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

alter policy "Users can manage their own profile"
on "public"."profiles"
to authenticated
using (( SELECT auth.uid() ) = id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user profile"
on "public"."profiles"
for select
to anon
using (id = demo_user_id());

alter policy "Users can manage their own lot consumptions"
on "public"."lot_consumptions"
to authenticated
using (( SELECT auth.uid() ) = (
  SELECT tax_lots.user_id
  FROM tax_lots
  WHERE (tax_lots.id = lot_consumptions.tax_lot_id)
) and (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user lot consumptions"
on "public"."lot_consumptions"
for select
to anon
using ((
  SELECT tax_lots.user_id
  FROM tax_lots
  WHERE (tax_lots.id = lot_consumptions.tax_lot_id)) = demo_user_id());

alter policy "Users can manage their own debts"
on "public"."debts"
to authenticated
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

alter policy "Users can manage their own performance snapshots"
on "public"."daily_performance_snapshots"
to authenticated
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user performance snapshots"
on "public"."daily_performance_snapshots"
for select
to anon 
using (user_id = demo_user_id());

drop policy "Service role can manage security prices"
on "public"."daily_stock_prices";

drop policy "Users can read security prices"
on "public"."daily_stock_prices";

create policy "Authenticated users can read stock prices"
on "public"."daily_stock_prices"
to authenticated
using (true);

drop policy "Allow read access to authenticated users"
on "public"."daily_market_indices";

create policy "Authenticated users can read market indices"
on "public"."daily_market_indices"
to authenticated
using (true);

drop policy "Allow service_role to perform all actions"
on "public"."daily_exchange_rates";

create policy "Authenticated users can read exchange rates"
on "public"."daily_exchange_rates"
to authenticated
using (true);

drop policy "Enable read access for all users"
on "public"."daily_crypto_prices";

create policy "Authenticated users can read crypto prices"
on "public"."daily_crypto_prices"
to authenticated
using (true);

alter policy "Authenticated users can read currencies"
on "public"."currencies"
to authenticated
using (true);

alter policy "Users can manage their own assets"
on "public"."assets"
to authenticated
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user assets"
on "public"."assets"
for select
to anon
using (user_id = demo_user_id());

alter policy "Users can manage their own accounts"
on "public"."accounts"
to public
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read demo user accounts"
on "public"."accounts"
for select
to anon
using (user_id = demo_user_id());