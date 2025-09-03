CREATE OR REPLACE FUNCTION "public"."refresh_performance_snapshots"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_date date;
BEGIN
  -- Try to get NEW.date if the column exists
  BEGIN
    v_date := NEW.date;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist → fall back to transaction_id lookup
      IF NEW.transaction_id IS NOT NULL THEN
        SELECT t.transaction_date
        INTO v_date
        FROM public.transactions t
        WHERE t.id = NEW.transaction_id;
      END IF;
  END;

  -- If we found a valid date, run generator
  IF v_date IS NOT NULL THEN
      PERFORM public.generate_performance_snapshots(v_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$;