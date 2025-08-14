CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'extensions'
    AS $$
DECLARE
  token text;
BEGIN
  -- Retrieve the secret directly from vault.decrypted_secrets
  SELECT decrypted_secret
  INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'vercel_revalidate_token';

  -- Call Vercel revalidate API
  PERFORM net.http_post(
    'https://portapp-vinh.vercel.app/api/revalidate',
    jsonb_build_object('x-secret-token', token)
  );

  RETURN NEW;
END;
$$;