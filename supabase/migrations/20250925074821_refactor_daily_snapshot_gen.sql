CREATE OR REPLACE FUNCTION "public"."generate_performance_snapshots"("p_start_date" "date", "p_end_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
    IF EXTRACT(ISODOW FROM loop_date) IN (6, 7) THEN CONTINUE;
    END IF;
    -- Calculate total assets value for the day
    WITH user_assets AS (
      SELECT
        a.id,
        a.asset_class,
        a.currency_code,
        SUM(tl.quantity) as total_quantity
      FROM transaction_legs tl
      JOIN transactions t ON tl.transaction_id = t.id
      JOIN assets a ON tl.asset_id = a.id
      WHERE t.transaction_date <= loop_date
        AND a.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.id, a.asset_class, a.currency_code
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN ua.asset_class = 'stock' THEN ua.total_quantity * sdp.price
        WHEN ua.asset_class = 'crypto' THEN ua.total_quantity * COALESCE(dcp.price, 1) * COALESCE(er_usd.rate, 1)
        ELSE ua.total_quantity * COALESCE(er.rate, 1)
      END
    ), 0)
    INTO v_total_assets_value
    FROM user_assets ua
    LEFT JOIN LATERAL (
      SELECT price FROM daily_stock_prices
      WHERE asset_id = ua.id AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) sdp ON ua.asset_class = 'stock'
    LEFT JOIN LATERAL (
      SELECT price FROM daily_crypto_prices
      WHERE asset_id = ua.id AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) dcp ON ua.asset_class = 'crypto'
    LEFT JOIN LATERAL (
      SELECT rate FROM daily_exchange_rates
      WHERE currency_code = ua.currency_code AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) er ON ua.asset_class NOT IN ('stock', 'crypto')
    LEFT JOIN LATERAL (
      SELECT rate FROM daily_exchange_rates
      WHERE currency_code = 'USD' AND date <= loop_date
      ORDER BY date DESC LIMIT 1
    ) er_usd ON ua.asset_class = 'crypto';
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
          WHERE t.related_debt_id = d.id
            AND t.transaction_date <= loop_date
            AND a.ticker = 'DEBTS'
        ) AS balance_at_date
      FROM debts d
      WHERE d.start_date <= loop_date
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN hdb.balance_at_date < 0 THEN
          ABS(hdb.balance_at_date) + (hdb.principal_amount * (POWER(1 + (hdb.interest_rate / 100 / 365), (loop_date - hdb.start_date)) - 1))
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
    WHERE t.transaction_date = loop_date
      AND t.type IN ('deposit', 'withdraw')
      AND a.asset_class IN ('cash', 'fund', 'crypto');
    v_net_equity_value := v_total_assets_value - v_total_liabilities_value;
    -- Calculate Equity Index
    SELECT net_equity_value, equity_index
    INTO v_previous_equity_value, v_previous_equity_index
    FROM daily_performance_snapshots
    WHERE date < loop_date
    ORDER BY date DESC
    LIMIT 1;
    
    IF v_previous_equity_value IS NULL THEN
      v_equity_index := 100; -- The first snapshot for the user
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
    INSERT INTO daily_performance_snapshots (date, net_equity_value, net_cash_flow, equity_index)
    VALUES (
      loop_date,
      v_net_equity_value,
      v_net_cash_flow,
      v_equity_index)
    ON CONFLICT (date) DO UPDATE
    SET net_equity_value = excluded.net_equity_value,
      net_cash_flow = excluded.net_cash_flow,
      equity_index = excluded.equity_index;
  END LOOP;
END;
$$;