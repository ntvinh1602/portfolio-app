-- supabase/migrations/20250729151000_combine_triggers.sql

-- 1. Combine transaction trigger functions
CREATE OR REPLACE FUNCTION "public"."handle_new_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Generate performance snapshot
  PERFORM public.generate_performance_snapshots(NEW.user_id, NEW.transaction_date, CURRENT_DATE);

  -- Revalidate the transaction-driven cache for the user
  PERFORM net.http_post(
    url := 'https://pamvtxbkdjnvkzeutmjk.supabase.co/functions/v1/trigger-revalidation',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('tag', 'txn-driven-' || NEW.user_id)
  );

  -- Revalidate the price-driven cache for the user, as a new transaction can affect summaries
  PERFORM net.http_post(
    url := 'https://pamvtxbkdjnvkzeutmjk.supabase.co/functions/v1/trigger-revalidation',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('tag', 'price-driven-' || NEW.user_id)
  );

  RETURN NEW;
END;
$$;

-- 2. Combine stock price trigger functions
CREATE OR REPLACE FUNCTION "public"."handle_new_stock_price"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who hold the stock and trigger snapshot generation and revalidation for them.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    WHERE a.security_id = NEW.security_id
  LOOP
    -- Generate performance snapshot
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);
    
    -- Revalidate price-driven cache
    PERFORM net.http_post(
      url := 'https://pamvtxbkdjnvkzeutmjk.supabase.co/functions/v1/trigger-revalidation',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('tag', 'price-driven-' || user_record.user_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- 3. Combine exchange rate trigger functions
CREATE OR REPLACE FUNCTION "public"."handle_new_exchange_rate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who have assets in the updated currency and trigger snapshot generation and revalidation.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE s.currency_code = NEW.currency_code
  LOOP
    -- Generate performance snapshot
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);

    -- Revalidate price-driven cache
    PERFORM net.http_post(
      url := 'https://pamvtxbkdjnvkzeutmjk.supabase.co/functions/v1/trigger-revalidation',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('tag', 'price-driven-' || user_record.user_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;