-- Create the SECURITY DEFINER function to get the secret
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

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_vercel_revalidate_token() TO authenticated;

-- Update the trigger function to use the new SECURITY DEFINER function
CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  token text;
begin
  -- Get the token using the new security definer function
  token := public.get_vercel_revalidate_token();
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