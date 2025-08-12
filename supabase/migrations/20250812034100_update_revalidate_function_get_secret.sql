CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'vault'
    AS $$
declare
  v_secret_id uuid;
  token text;
begin
  -- Get the UUID of the secret
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = 'vercel_revalidate_token';

  -- Get the token from Vault using the UUID
  token := vault.get_secret(v_secret_id);

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