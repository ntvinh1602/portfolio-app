CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'vault'
    AS $$
declare
  token text;
begin
  -- Get the token from Vault
  token := vault.get_secret('vercel_revalidate_token');
  -- Call the Supabase HTTP function
  perform supabase_functions.http_request(
    'https://portapp-vinh.vercel.app/api/revalidate',
    'POST',
    format('{"x-secret-token":"%s"}', token),
    '{}',
    '5000'
  );
  return new;
end;
$$;