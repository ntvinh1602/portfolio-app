-- 1. Reset the pg_net extension
DROP EXTENSION IF EXISTS "pg_net" CASCADE;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. Grant permissions on the vault
GRANT USAGE ON SCHEMA vault TO authenticated;
GRANT SELECT ON vault.decrypted_secrets TO authenticated;

-- 3. Create the SECURITY DEFINER function to get the secret
CREATE OR REPLACE FUNCTION public.get_vercel_revalidate_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  token text;
BEGIN
  SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name = 'vercel_revalidate_token';
  RETURN token;
END;
$$;

-- 4. Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_vercel_revalidate_token() TO authenticated;

-- 5. Change the owner of the function to postgres
ALTER FUNCTION public.get_vercel_revalidate_token() OWNER TO postgres;

-- 6. Update the trigger function to use the new SECURITY DEFINER function and call pg_net directly
CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, extensions
    AS $$
declare
  token text;
begin
  -- Get the token using the new security definer function
  token := public.get_vercel_revalidate_token();
  -- Call the pg_net http_post function directly
  perform net.http_post(
    'https://portapp-vinh.vercel.app/api/revalidate',
    jsonb_build_object('x-secret-token', token)
  );
  return new;
end;
$$;