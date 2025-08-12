CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, vault, supabase_functions
    AS $$
declare
  token text;
begin
  -- Get the token using the new security definer function
  token := public.get_vercel_revalidate_token();
  -- Call the Supabase HTTP function with a fully qualified name
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