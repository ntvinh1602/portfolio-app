-- Drop the existing function to replace it
DROP FUNCTION IF EXISTS public.generate_performance_snapshots(uuid, date, date);

-- Rename the table
ALTER TABLE public.exchange_rates RENAME TO daily_exchange_rates;

-- Recreate the function with the new table name
CREATE OR REPLACE FUNCTION public.generate_performance_snapshots(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    loop_date date;
    v_total_assets_value numeric;
    v_total_liabilities_value numeric;
    v_net_cash_flow numeric;
    v_net_equity_value numeric;
    v_previous_equity_value numeric;
    v_previous_equity_index numeric;
    v_daily_return numeric;
    v_equity_index numeric;
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
              AND s.asset_class NOT IN ('equity', 'liability')
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
            SELECT price FROM daily_stock_prices
            WHERE security_id = ua.security_id AND date <= loop_date
            ORDER BY date DESC LIMIT 1
        ) sdp ON ua.asset_class = 'stock'
        LEFT JOIN LATERAL (
            SELECT rate FROM daily_exchange_rates
            WHERE currency_code = ua.currency_code AND date <= loop_date
            ORDER BY date DESC LIMIT 1
        ) er ON ua.asset_class != 'stock';

        -- Calculate total liabilities value for the day
        WITH historical_debt_balances AS (
            SELECT
                d.id,
                d.principal_amount,
                d.interest_rate,
                d.start_date,
                (
                    SELECT COALESCE(SUM(tl.amount), 0)
                    FROM transaction_legs tl
                    JOIN transactions t ON tl.transaction_id = t.id
                    JOIN assets a ON tl.asset_id = a.id
                    JOIN securities s ON a.security_id = s.id
                    WHERE t.related_debt_id = d.id
                      AND t.user_id = p_user_id
                      AND t.transaction_date <= loop_date
                      AND s.ticker = 'LOANS_PAYABLE'
                ) AS balance_at_date
            FROM debts d
            WHERE d.user_id = p_user_id
              AND d.start_date <= loop_date
        )
        SELECT COALESCE(SUM(
            CASE
                WHEN hdb.balance_at_date < 0 THEN
                    ABS(hdb.balance_at_date)
                    +
                    (hdb.principal_amount * (POWER(1 + (hdb.interest_rate / 100 / 365), (loop_date - hdb.start_date)) - 1))
                ELSE 0
            END
        ), 0)
        INTO v_total_liabilities_value
        FROM historical_debt_balances hdb;

        -- Calculate net cash flow for the day
        SELECT COALESCE(SUM(tl.amount), 0)
        INTO v_net_cash_flow
        FROM transactions t
        JOIN transaction_legs tl ON t.id = tl.transaction_id
        JOIN assets a ON tl.asset_id = a.id
        JOIN securities s ON a.security_id = s.id
        WHERE t.user_id = p_user_id
          AND t.transaction_date = loop_date
          AND t.type IN ('deposit', 'withdraw')
          AND s.asset_class IN ('cash', 'epf');

        v_net_equity_value := v_total_assets_value - v_total_liabilities_value;

        -- Calculate Equity Index
        SELECT net_equity_value, equity_index
        INTO v_previous_equity_value, v_previous_equity_index
        FROM daily_performance_snapshots
        WHERE user_id = p_user_id AND date < loop_date
        ORDER BY date DESC
        LIMIT 1;

        IF v_previous_equity_value IS NULL THEN
            -- This is the first snapshot for the user
            v_equity_index := 100;
        ELSE
            -- Calculate daily return and chain the index
            IF v_previous_equity_value = 0 THEN
                v_daily_return := 0; -- Avoid division by zero
            ELSE
                v_daily_return := (v_net_equity_value - v_net_cash_flow - v_previous_equity_value) / v_previous_equity_value;
            END IF;
            v_equity_index := v_previous_equity_index * (1 + v_daily_return);
        END IF;

        -- Insert or update the snapshot for the day
        INSERT INTO daily_performance_snapshots (user_id, date, total_assets_value, total_liabilities_value, net_equity_value, net_cash_flow, equity_index)
        VALUES (p_user_id, loop_date, v_total_assets_value, v_total_liabilities_value, v_net_equity_value, v_net_cash_flow, v_equity_index)
        ON CONFLICT (user_id, date) DO UPDATE
        SET total_assets_value = excluded.total_assets_value,
            total_liabilities_value = excluded.total_liabilities_value,
            net_equity_value = excluded.net_equity_value,
            net_cash_flow = excluded.net_cash_flow,
            equity_index = excluded.equity_index;

    END LOOP;
END;
$$;