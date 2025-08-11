CREATE OR REPLACE FUNCTION "public"."handle_new_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_transaction_date DATE;
BEGIN
  -- Get the user_id and transaction_date from the parent transaction
  SELECT t.user_id, t.transaction_date 
  INTO v_user_id, v_transaction_date
  FROM public.transactions t
  WHERE t.id = NEW.transaction_id;

  -- Call the snapshot generation function for the user who made the transaction
  -- from the transaction date to the current date.
  PERFORM public.generate_performance_snapshots(v_user_id, v_transaction_date, CURRENT_DATE);
  RETURN NEW;
END;
$$;