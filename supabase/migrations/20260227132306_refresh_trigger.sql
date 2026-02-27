drop trigger if exists refresh_after_fx_rate on historical_fxrate;
drop trigger if exists refresh_after_prices on historical_prices;

create trigger refresh_after_fx_rate
after insert or update
on public.historical_fxrate
for each statement
execute function public.enqueue_refresh_data();

create trigger refresh_after_prices
after insert or update
on public.historical_prices
for each statement
execute function public.enqueue_refresh_data();

ALTER TABLE "public"."refresh_queue" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access for authenticated users" ON "public"."refresh_queue" TO "authenticated" USING (true);

drop function if exists public.run_refresh_data();

create or replace function public.process_refresh_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_count integer;
  vercel_secret text;
  response jsonb;
begin
  -- Check if anything is queued
  select count(*) into pending_count from public.refresh_queue;

  if pending_count = 0 then
    return;
  end if;

  -- Clear queue first (acts as debounce)
  delete from public.refresh_queue;

  -- Concurrent refresh (allowed because NOT inside trigger)
  refresh materialized view concurrently public.daily_snapshots;
  refresh materialized view public.dashboard_data;

  -- Get secret from Vault
  select decrypted_secret
  into vercel_secret
  from vault.decrypted_secrets
  where name = 'VERCEL_SECRET';

  if vercel_secret is null then
    raise exception 'VERCEL_SECRET not found in vault';
  end if;

  -- Call Next.js revalidate endpoint
  select net.http_post(
    url := 'https://portapp-vinh.vercel.app/api/revalidate',
    headers := jsonb_build_object(
      'x-revalidate-secret', vercel_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  into response;

end;
$$;