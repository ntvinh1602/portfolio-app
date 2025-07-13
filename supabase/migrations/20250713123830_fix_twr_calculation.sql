-- Drop the existing function to ensure a clean update
DROP FUNCTION IF EXISTS "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date");

-- Recreate the function to use the equity_index for accurate TWR calculation
CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_start_index NUMERIC;
    v_end_index NUMERIC;
    v_twr NUMERIC;
BEGIN
    -- Get the equity index from the day before the start date
    SELECT equity_index INTO v_start_index
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date < p_start_date
    ORDER BY date DESC
    LIMIT 1;

    -- If no prior snapshot, this is the first month.
    -- The starting index is conceptually 100 before the first day.
    IF v_start_index IS NULL THEN
        v_start_index := 100;
    END IF;

    -- Get the equity index at the end of the period
    SELECT equity_index INTO v_end_index
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date <= p_end_date
    ORDER BY date DESC
    LIMIT 1;

    -- If there's no data for the period, return 0
    IF v_end_index IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate TWR as the percentage change in the equity index
    v_twr := (v_end_index / v_start_index) - 1;

    RETURN v_twr;
END;
$$;