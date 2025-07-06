CREATE OR REPLACE FUNCTION get_monthly_pnl(p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE(month TEXT, pnl NUMERIC) AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_start_equity NUMERIC;
    v_end_equity NUMERIC;
    v_cash_flow NUMERIC;
    v_pnl NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(p_start_date, p_end_date, '1 month'::interval) dd
    LOOP
        v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

        -- Get starting equity (closing equity of the previous month)
        SELECT net_equity_value INTO v_start_equity
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date < v_month_start
        ORDER BY date DESC
        LIMIT 1;

        -- Get ending equity (closing equity of the current month)
        SELECT net_equity_value INTO v_end_equity
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date <= v_month_end
        ORDER BY date DESC
        LIMIT 1;

        -- Get net cash flow for the current month
        SELECT COALESCE(SUM(net_cash_flow), 0) INTO v_cash_flow
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date >= v_month_start AND date <= v_month_end;

        -- Calculate PnL
        v_pnl := (COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow;

        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        pnl := v_pnl;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_monthly_pnl(UUID, DATE, DATE) TO authenticated;