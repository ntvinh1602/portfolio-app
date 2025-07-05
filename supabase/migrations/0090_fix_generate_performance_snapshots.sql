-- Drop the old function
DROP FUNCTION IF EXISTS "public"."generate_performance_snapshots"(p_user_id uuid, p_start_date date, p_end_date date);

-- Recreate the function with the corrected column name
CREATE OR REPLACE FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    loop_date date;
    v_total_assets_value numeric;
    v_total_liabilities_value numeric;
    v_net_cash_flow numeric;
    v_net_equity_value numeric;
BEGIN
    FOR loop_date IN SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date LOOP
        -- Skip weekends
        IF EXTRACT(ISODOW FROM loop_date) IN (6, 7) THEN
            CONTINUE;
        END IF;

        -- Calculate total assets value for the day
        WITH user_assets AS (
            SELECT
                a.security_id,
                s.asset_class,
                s.currency_code,
                SUM(tl.quantity) as total_quantity
            FROM transaction_legs tl
            JOIN transactions t ON tl.transaction_id = t.id
            JOIN assets a ON tl.asset_id = a.id
            JOIN securities s ON a.security_id = s.id
            WHERE a.user_id = p_user_id
              AND t.transaction_date <= loop_date
            GROUP BY a.security_id, s.asset_class, s.currency_code
        )
        SELECT COALESCE(SUM(
            CASE
                WHEN ua.asset_class = 'stock' THEN ua.total_quantity * sdp.price
                ELSE ua.total_quantity * COALESCE(er.rate, 1)
            END
        ), 0)
        INTO v_total_assets_value
        FROM user_assets ua
        LEFT JOIN LATERAL (
            SELECT price FROM security_daily_prices
            WHERE security_id = ua.security_id AND date <= loop_date
            ORDER BY date DESC LIMIT 1
        ) sdp ON ua.asset_class = 'stock'
        LEFT JOIN LATERAL (
            SELECT rate FROM exchange_rates
            WHERE currency_code = ua.currency_code AND date <= loop_date
            ORDER BY date DESC LIMIT 1
        ) er ON ua.asset_class != 'stock';

        -- Calculate total liabilities value for the day
        SELECT COALESCE(SUM(
            (
                SELECT abs(coalesce(sum(tl.amount), 0))
                FROM transaction_legs tl
                JOIN transactions t ON tl.transaction_id = t.id
                JOIN assets a ON tl.asset_id = a.id
                JOIN securities s ON a.security_id = s.id
                WHERE t.related_debt_id = d.id
                  AND t.user_id = p_user_id
                  AND t.transaction_date <= loop_date
                  AND s.ticker = 'LOANS_PAYABLE'
            )
            +
            (
                d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (loop_date - d.start_date)) - 1)
            )
        ), 0)
        INTO v_total_liabilities_value
        FROM debts d
        WHERE d.user_id = p_user_id
          AND d.status = 'active'
          AND d.start_date <= loop_date;

        -- Calculate net cash flow for the day
        SELECT COALESCE(SUM(
            CASE
                WHEN t.type = 'deposit' THEN tl.amount
                WHEN t.type = 'withdraw' THEN -tl.amount
                ELSE 0
            END
        ), 0)
        INTO v_net_cash_flow
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        WHERE t.user_id = p_user_id
          AND t.transaction_date = loop_date
          AND t.type IN ('deposit', 'withdraw');

        v_net_equity_value := v_total_assets_value - v_total_liabilities_value;

        -- Insert or update the snapshot for the day
        INSERT INTO daily_performance_snapshots (user_id, date, total_assets_value, total_liabilities_value, net_equity_value, net_cash_flow)
        VALUES (p_user_id, loop_date, v_total_assets_value, v_total_liabilities_value, v_net_equity_value, v_net_cash_flow)
        ON CONFLICT (user_id, date) DO UPDATE
        SET total_assets_value = excluded.total_assets_value,
            total_liabilities_value = excluded.total_liabilities_value,
            net_equity_value = excluded.net_equity_value,
            net_cash_flow = excluded.net_cash_flow;
    END LOOP;
END;
$$;