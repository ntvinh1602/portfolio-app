DROP POLICY "Logged in users can access assets" ON assets;

create policy "Auth users can read assets"
on assets for select
to authenticated
using ( true );

DROP POLICY "Logged in users can access currency" ON currencies;

create policy "Auth users can read currencies"
on currencies for select
to authenticated
using ( true );

DROP POLICY "Users can read DNSE orders" ON dnse_orders;

create policy "Auth users can read dnse_orders"
on dnse_orders for select
to authenticated
using ( true );

DROP POLICY "Authenticated users can access exchange rates" ON historical_fxrate;

create policy "Auth users can read historical_fxrate"
on historical_fxrate for select
to authenticated
using ( true );

DROP POLICY "Authenticated users can access stock prices" ON historical_prices;

create policy "Auth users can read historical_prices"
on historical_prices for select
to authenticated
using ( true );