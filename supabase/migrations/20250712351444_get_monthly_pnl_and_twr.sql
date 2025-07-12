CREATE OR REPLACE FUNCTION public.get_monthly_twr(
    p_user_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE(month text, twr numeric)
LANGUAGE plpgsql
AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_twr NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(p_start_date, p_end_date, '1 month'::interval) dd
    LOOP
        v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

        -- Calculate TWR for the month
        SELECT public.calculate_twr(p_user_id, v_month_start, v_month_end) INTO v_twr;

        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        twr := v_twr;

        RETURN NEXT;
    END LOOP;
END;
$$;