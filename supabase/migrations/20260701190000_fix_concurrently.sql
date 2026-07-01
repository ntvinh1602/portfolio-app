SET check_function_bodies = false;
DROP EXTENSION if exists pg_graphql;
CREATE OR REPLACE FUNCTION public.process_refresh_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  pending_count integer;
  app_secret text;
  app_url text;
  response jsonb;
begin
  -- Check if anything is queued
  select count(*)
  into pending_count
  from public.refresh_queue;

  if pending_count = 0 then
    return;
  end if;

  -- Clear queue first (debounce behavior)
  delete from public.refresh_queue;

  -- Refresh materialized views
  refresh materialized view public.daily_snapshots;

  -- Get secrets from Vault
  select decrypted_secret
  into app_secret
  from vault.decrypted_secrets
  where name = 'APP_SECRET';

  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'APP_URL';

  if app_secret is null then
    raise exception 'APP_SECRET not found in vault';
  end if;

  if app_url is null then
    raise exception 'APP_URL not found in vault';
  end if;

  -- Call app update cache endpoint
  select net.http_post(
    url := app_url || '/api/update',
    headers := jsonb_build_object(
      'x-update-secret', app_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'tags', jsonb_build_array('analytics')
    )
  )
  into response;
end;$function$;
