-- Drop the existing function to ensure a clean update
DROP FUNCTION IF EXISTS "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date");

-- Recreate the function with the fix for the first month's calculation
CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_start_equity NUMERIC;
    v_end_equity NUMERIC;
    v_cash_flow NUMERIC;
    v_pnl NUMERIC;
BEGIN
    -- Get starting equity (closing equity of the day before the start date)
    SELECT net_equity_value INTO v_start_equity
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date < p_start_date
    ORDER BY date DESC
    LIMIT 1;

    -- If no prior snapshot, this is the first month.
    -- Use the opening equity of the first day as the starting equity.
    IF v_start_equity IS NULL THEN
        SELECT (net_equity_value - net_cash_flow) INTO v_start_equity
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date >= p_start_date
        ORDER BY date ASC
        LIMIT 1;
    END IF;

    -- Get ending equity (closing equity of the end date)
    SELECT net_equity_value INTO v_end_equity
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date <= p_end_date
    ORDER BY date DESC
    LIMIT 1;

    -- Get net cash flow for the period
    SELECT COALESCE(SUM(net_cash_flow), 0) INTO v_cash_flow
    FROM daily_performance_snapshots
    WHERE user_id = p_user_id AND date >= p_start_date AND date <= p_end_date;

    -- Calculate PnL
    v_pnl := (COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow;

    RETURN v_pnl;
END;
$$;