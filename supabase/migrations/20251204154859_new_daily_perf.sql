ALTER TABLE daily_performance_snapshots
ADD COLUMN IF NOT EXISTS total_cashflow numeric;

CREATE OR REPLACE FUNCTION public.generate_performance_snapshots(
  p_start_date date,
  p_end_date date
) RETURNS void
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  loop_date date;
  v_total_assets_value numeric;
  v_total_liabilities_value numeric;
  v_net_cash_flow numeric;
  v_total_cashflow numeric;
  v_net_equity_value numeric;
  v_previous_equity_value numeric;
  v_previous_equity_index numeric;
  v_previous_total_cashflow numeric;
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
        a.currency_code,
        SUM(tl.quantity) AS total_quantity
      FROM transaction_legs tl
      JOIN transactions t ON tl.transaction_id = t.id
      JOIN assets a ON tl.asset_id = a.id
      WHERE t.transaction_date <= loop_date
        AND a.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.id, a.currency_code
    )
    SELECT COALESCE(SUM(
      ua.total_quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)
    ), 0)
    INTO v_total_assets_value
    FROM user_assets ua
    LEFT JOIN LATERAL (
      SELECT price FROM public.daily_security_prices
      WHERE asset_id = ua.id AND date <= loop_date
      ORDER BY date DESC
      LIMIT 1
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT rate FROM public.daily_exchange_rates
      WHERE currency_code = ua.currency_code AND date <= loop_date
      ORDER BY date DESC
      LIMIT 1
    ) er ON TRUE;

    -- Calculate total liabilities value for the day
    WITH historical_debt_balances AS (
      SELECT
        d.id,
        d.principal_amount,
        d.interest_rate,
        tb.transaction_date AS start_date,
        tr.transaction_date AS end_date,
        CASE
          WHEN tr.transaction_date IS NOT NULL AND tr.transaction_date <= loop_date THEN 0
          ELSE d.principal_amount
        END AS balance_at_date
      FROM debts d
      JOIN transactions tb ON tb.id = d.borrow_txn_id
      LEFT JOIN transactions tr ON tr.id = d.repay_txn_id
      WHERE tb.transaction_date <= loop_date
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN hdb.balance_at_date > 0 THEN
          hdb.balance_at_date * POWER(1 + (hdb.interest_rate / 100 / 365), (loop_date - hdb.start_date))
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

    -- Retrieve previous day's data
    SELECT net_equity_value, equity_index, total_cashflow
    INTO v_previous_equity_value, v_previous_equity_index, v_previous_total_cashflow
    FROM daily_performance_snapshots
    WHERE date < loop_date
    ORDER BY date DESC
    LIMIT 1;

    -- Calculate equity value
    v_net_equity_value := v_total_assets_value - v_total_liabilities_value;

    -- Calculate cumulative cashflow
    IF v_previous_total_cashflow IS NULL THEN
      v_total_cashflow := v_net_cash_flow;
    ELSE
      v_total_cashflow := v_previous_total_cashflow + v_net_cash_flow;
    END IF;

    -- Calculate Equity Index
    IF v_previous_equity_value IS NULL THEN
      v_equity_index := 100; -- first snapshot
    ELSE
      IF v_previous_equity_value = 0 THEN
        v_daily_return := 0;
      ELSE
        v_daily_return := (v_net_equity_value - v_net_cash_flow - v_previous_equity_value) / v_previous_equity_value;
      END IF;
      v_equity_index := v_previous_equity_index * (1 + v_daily_return);
    END IF;

    -- Insert or update the snapshot for the day
    INSERT INTO daily_performance_snapshots (date, net_equity_value, net_cash_flow, total_cashflow, equity_index)
    VALUES (
      loop_date,
      v_net_equity_value,
      v_net_cash_flow,
      v_total_cashflow,
      v_equity_index
    )
    ON CONFLICT (date) DO UPDATE
    SET net_equity_value = EXCLUDED.net_equity_value,
        net_cash_flow = EXCLUDED.net_cash_flow,
        total_cashflow = EXCLUDED.total_cashflow,
        equity_index = EXCLUDED.equity_index;
  END LOOP;
END;
$$;
