DROP POLICY "Access for authenticated users" ON asset_positions;

create policy "Auth users can read asset_positions"
on asset_positions for select
to authenticated
using ( true );