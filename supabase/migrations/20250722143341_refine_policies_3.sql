drop policy "Guests can read crypto prices"
on "public"."daily_crypto_prices";

create policy "Guests including anonymous can read crypto prices"
on "public"."daily_crypto_prices"
for select
to authenticated
using (true);

drop policy "Authenticated users can read exchange rates"
on "public"."daily_exchange_rates";

create policy "Guests including anonymous can read exchange rates"
on "public"."daily_exchange_rates"
for select
to authenticated
using (true);

create policy "Users can manage exchange rates"
on "public"."daily_exchange_rates"
to authenticated
using ((select (auth.jwt()->>'is_anonymous')::boolean) is false);

drop policy "Authenticated users can read market indices"
on "public"."daily_market_indices";

create policy "Guests including anonymous can read market indices"
on "public"."daily_market_indices"
for select
to authenticated
using (true);

create policy "Users can manage market indices"
on "public"."daily_market_indices"
to authenticated
using ((select (auth.jwt()->>'is_anonymous')::boolean) is false);

drop policy "Authenticated users can read stock prices"
on "public"."daily_stock_prices";

create policy "Guests including anonymous can read stock prices"
on "public"."daily_stock_prices"
for select
to authenticated
using (true);

create policy "Users can manage stock prices"
on "public"."daily_stock_prices"
to authenticated
using ((select (auth.jwt()->>'is_anonymous')::boolean) is false);

drop policy "Authenticated users can read currencies"
on "public"."currencies";

create policy "Authenticated users including anonymous can read currencies"
on "public"."currencies"
for select
to authenticated
using (true);

drop policy "Authenticated users can read securities"
on "public"."securities";

create policy "Authenticated users including anonymous can read securities"
on "public"."securities"
for select
to authenticated
using (true);

