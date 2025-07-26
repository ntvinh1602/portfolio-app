drop policy "Users can manage their own assets" on "public"."assets";
drop policy "Users can manage crypto prices" on "public"."daily_crypto_prices";
drop policy "Users can manage exchange rates" on "public"."daily_exchange_rates";
drop policy "Users can manage market indices" on "public"."daily_market_indices";
drop policy "Users can manage their own performance snapshots" on "public"."daily_performance_snapshots";
drop policy "Users can manage stock prices" on "public"."daily_stock_prices";
drop policy "Users can manage their own debts" on "public"."debts";
drop policy "Users can manage their own lot consumptions" on "public"."lot_consumptions";
drop policy "Users can manage their own profile" on "public"."profiles";
drop policy "Users can manage their own tax lots" on "public"."tax_lots";
drop policy "Users can manage details for their own transactions" on "public"."transaction_details";
drop policy "Users can manage their own transaction_legs" on "public"."transaction_legs";
drop policy "Users can manage their own transactions" on "public"."transactions";

create policy "Authenticated users can access own assets or demo assets"
on "public"."assets"
to authenticated
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);

create policy "Authenticated users can access crypto prices"
on "public"."daily_crypto_prices"
to authenticated
using (true);

create policy "Authenticated users can access exchange rates"
on "public"."daily_exchange_rates"
to authenticated
using (true);

create policy "Authenticated users can access market indices"
on "public"."daily_market_indices"
to authenticated
using (true);

create policy "Authenticated users can access their own or demo performance snapshots"
on "public"."daily_performance_snapshots"
to authenticated
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);

create policy "Authenticated users can access stock prices"
on "public"."daily_stock_prices"
to authenticated
using (true);

create policy "Authenticated users can access their own or demo debts"
on "public"."debts"
to authenticated
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);

create policy "Authenticated users can access their own or demo lot consumptions"
on "public"."lot_consumptions"
to authenticated
using (
  (
    (SELECT auth.uid()) = ( 
      SELECT tax_lots.user_id
      FROM tax_lots
      WHERE (tax_lots.id = lot_consumptions.tax_lot_id)) AND is_registered_user()
  )
  OR
  (
    demo_user_id() = ( 
      SELECT tax_lots.user_id
      FROM tax_lots
      WHERE (tax_lots.id = lot_consumptions.tax_lot_id)) AND is_registered_user() is false
  )
);

create policy "Authenticated users can access their own profile or demo profile"
on "public"."profiles"
to authenticated
USING (
  (demo_user_id() = id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = id AND is_registered_user())
);

create policy "Authenticated users can access their own or demo tax lots"
on "public"."tax_lots"
to authenticated
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);

create policy "Authenticated users can access details for their own or demo transactions"
on "public"."transaction_details"
to authenticated
using (
  (
    (SELECT auth.uid()) = ( 
      SELECT transactions.user_id
      FROM transactions
      WHERE (transactions.id = transaction_details.transaction_id)) AND is_registered_user()
  )
  OR
  (
    demo_user_id() = ( 
      SELECT transactions.user_id
      FROM transactions
      WHERE (transactions.id = transaction_details.transaction_id)) AND is_registered_user() is false
  )
);

create policy "Authenticated users can access their own or demo transaction_legs"
on "public"."transaction_legs"
to authenticated
using (
  (
    (SELECT auth.uid()) = ( 
      SELECT transactions.user_id
      FROM transactions
      WHERE (transactions.id = transaction_legs.transaction_id)) AND is_registered_user()
  )
  OR
  (
    demo_user_id() = ( 
      SELECT transactions.user_id
      FROM transactions
      WHERE (transactions.id = transaction_legs.transaction_id)) AND is_registered_user() is false
  )
);

create policy "Authenticated users can access their own or demo transactions"
on "public"."transactions"
to authenticated
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);
