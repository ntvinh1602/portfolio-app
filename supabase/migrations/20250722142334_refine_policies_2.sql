drop policy "Authenticated users can read crypto prices"
on "public"."daily_crypto_prices";

create policy "Users can manage crypto prices"
on "public"."daily_crypto_prices"
to authenticated
using ((select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "Guests can read crypto prices"
on "public"."daily_crypto_prices"
for select
to authenticated
using (true);