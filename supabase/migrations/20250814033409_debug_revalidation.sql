CREATE OR REPLACE FUNCTION "public"."call_vercel_revalidate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'extensions'
    AS $$
DECLARE
  token text;
BEGIN
  -- Log trigger activation
  RAISE NOTICE 'call_vercel_revalidate triggered for stock_id=%, date=%', NEW.stock_id, NEW.date;

  -- Retrieve secret
  SELECT decrypted_secret INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'vercel_revalidate_token';

  -- Call API
  PERFORM net.http_post(
    'https://portapp-vinh.vercel.app/api/revalidate',
    jsonb_build_object('x-secret-token', token)
  );

  RETURN NEW;
END;
$$;
