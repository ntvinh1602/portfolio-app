create table if not exists public.refresh_queue (
  id bigserial primary key,
  created_at timestamptz default now()
);

create or replace function public.enqueue_refresh_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.refresh_queue default values;
  return null;
end;
$$;

create trigger refresh_after_tx_legs
after insert
on public.tx_legs
for each statement
execute function public.enqueue_refresh_data();

create trigger refresh_after_fx_rate
after insert
on public.historical_fxrate
for each statement
execute function public.enqueue_refresh_data();

create trigger refresh_after_prices
after insert
on public.historical_prices
for each statement
execute function public.enqueue_refresh_data();

create or replace function public.run_refresh_data()
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

drop function if exists trigger_refresh_dashboard;