DROP POLICY "Access for authenticated users" ON tx_cashflow;

create policy "Auth users can read tx_cashflow"
on tx_cashflow for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON tx_debt;

create policy "Auth users can read tx_debt"
on tx_debt for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON tx_entries;

create policy "Auth users can read tx_entries"
on tx_entries for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON tx_legs;

create policy "Auth users can read tx_legs"
on tx_legs for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON tx_stock;

create policy "Auth users can read tx_stock"
on tx_stock for select
to authenticated
using ( true );
