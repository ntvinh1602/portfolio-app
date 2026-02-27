create or replace function public.trigger_refresh_dashboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vercel_secret text;
  response jsonb;
begin
  -- Get secret from Supabase Vault
  select decrypted_secret
  into vercel_secret
  from vault.decrypted_secrets
  where name = 'VERCEL_SECRET';

  if vercel_secret is null then
    raise exception 'VERCEL_SECRET not found in vault';
  end if;

  -- IMPORTANT: Cannot use CONCURRENTLY inside trigger
  refresh materialized view public.daily_snapshots;
  refresh materialized view public.dashboard_data;

  -- Call Next.js revalidation endpoint
  select net.http_post(
    url := 'https://portapp-vinh.vercel.app/api/revalidate',
    headers := jsonb_build_object(
      'x-revalidate-secret', vercel_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  into response;

  return null;
end;
$$;