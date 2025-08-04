CREATE OR REPLACE FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "pnl" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_pnl NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(date_trunc('month', p_start_date)::date, p_end_date, '1 month'::interval) dd
    LOOP
        -- For the last month in the series, use the p_end_date
        IF date_trunc('month', v_month_start) = date_trunc('month', p_end_date) THEN
            v_month_end := p_end_date;
        ELSE
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
        END IF;
        -- Calculate PnL for the month using the existing function
        SELECT public.calculate_pnl(p_user_id, v_month_start, v_month_end) INTO v_pnl;
        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        pnl := v_pnl;
        RETURN NEXT;
    END LOOP;
END;
$$;

ALTER FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "twr" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_twr NUMERIC;
BEGIN
    FOR v_month_start IN
        SELECT date_trunc('month', dd)::DATE
        FROM generate_series(date_trunc('month', p_start_date)::date, p_end_date, '1 month'::interval) dd
    LOOP
        -- For the last month in the series, use the p_end_date
        IF date_trunc('month', v_month_start) = date_trunc('month', p_end_date) THEN
            v_month_end := p_end_date;
        ELSE
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;
        END IF;
        -- Calculate TWR for the month
        SELECT public.calculate_twr(p_user_id, v_month_start, v_month_end) INTO v_twr;
        -- Return the result for the month
        month := to_char(v_month_start, 'YYYY-MM');
        twr := v_twr;
        RETURN NEXT;
    END LOOP;
END;
$$;

ALTER FUNCTION "public"."get_monthly_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";