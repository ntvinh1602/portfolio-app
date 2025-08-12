CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'vault'
    AS $$
declare
  token text;
begin
  -- Get the token from the decrypted_secrets view
  SELECT decrypted_secret INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'vercel_revalidate_token';

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