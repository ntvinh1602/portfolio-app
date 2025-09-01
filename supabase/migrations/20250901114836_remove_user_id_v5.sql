drop policy if exists "Users can access their assets" on "public"."assets";

create policy "Logged in users can access assets"
on "public"."assets"
to authenticated
using (true);

drop policy if exists "Authenticated users including anonymous can read currencies"
on "public"."currencies";

create policy "Logged in users can access currency"
on "public"."currencies"
to authenticated
using (true);

drop policy if exists "Users can access their lot consumptions"
on "public"."lot_consumptions";

create policy "Logged in users can access lot consumptions"
on "public"."lot_consumptions"
to authenticated
using (true);

drop policy if exists "Users can access their tax lots"
on "public"."tax_lots";

create policy "Logged in users can access tax lots"
on "public"."tax_lots"
to authenticated
using (true);

drop policy if exists "Users can access their transaction legs"
on "public"."transaction_legs";

create policy "Logged in users can access transaction legs"
on "public"."transaction_legs"
to authenticated
using (true);

drop policy if exists "Users can access their transactions"
on "public"."transactions";

create policy "Logged in users can access transactions"
on "public"."transactions"
to authenticated
using (true);