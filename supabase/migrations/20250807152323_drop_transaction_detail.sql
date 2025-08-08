DROP TABLE IF EXISTS public.transaction_details;

CREATE OR REPLACE FUNCTION "public"."get_monthly_expenses"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "trading_fees" numeric, "taxes" numeric, "interest" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH month_series AS (
        SELECT date_trunc('month', dd)::date AS month
        FROM generate_series(p_start_date, p_end_date, '1 month'::interval) dd
    ),
    -- 1. Fees and Taxes from expense transactions
    trading_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%fee%'), 0) AS total_fees,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%tax%'), 0) AS total_taxes
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'expense'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    ),
    -- 2. Loan Interest from debt_payment transactions
    loan_interest_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount), 0) AS total_interest
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'debt_payment'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    ),
    -- 3. Margin and Cash Advance Interest from expense transactions
    other_interest_costs AS (
        SELECT
            date_trunc('month', t.transaction_date)::date AS month,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Margin%'), 0) AS total_margin_interest,
            COALESCE(SUM(tl.amount) FILTER (WHERE t.description ILIKE '%Cash advance%'), 0) AS total_cash_advance_interest
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.type = 'expense'
          AND s.ticker IN ('EARNINGS', 'CAPITAL')
        GROUP BY 1
    )
    -- Final aggregation
    SELECT
        to_char(ms.month, 'YYYY-MM') AS month,
        COALESCE(tc.total_fees, 0) AS trading_fees,
        COALESCE(tc.total_taxes, 0) AS taxes,
        (COALESCE(lic.total_interest, 0) + COALESCE(oic.total_margin_interest, 0) + COALESCE(oic.total_cash_advance_interest, 0)) AS interest
    FROM month_series ms
    LEFT JOIN trading_costs tc ON ms.month = tc.month
    LEFT JOIN loan_interest_costs lic ON ms.month = lic.month
    LEFT JOIN other_interest_costs oic ON ms.month = oic.month
    ORDER BY ms.month;
END;
$$;