drop function if exists public.calculate_pnl(uuid, date, date);

CREATE OR REPLACE FUNCTION "public"."calculate_pnl"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_start_equity NUMERIC;
  v_end_equity NUMERIC;
  v_cash_flow NUMERIC;
  v_pnl NUMERIC;
BEGIN
  -- Get starting equity (closing equity of the day before the start date)
  SELECT net_equity_value INTO v_start_equity
  FROM public.daily_performance_snapshots
  WHERE date < p_start_date
  ORDER BY date DESC
  LIMIT 1;
  -- If no prior snapshot, this is the first month.
  -- Use the opening equity of the first day as the starting equity.
  IF v_start_equity IS NULL THEN
    SELECT (net_equity_value - net_cash_flow) INTO v_start_equity
    FROM public.daily_performance_snapshots
    WHERE date >= p_start_date
    ORDER BY date ASC
    LIMIT 1;
  END IF;
  -- Get ending equity (closing equity of the end date)
  SELECT net_equity_value INTO v_end_equity
  FROM public.daily_performance_snapshots
  WHERE date <= p_end_date
  ORDER BY date DESC
  LIMIT 1;
  -- Get net cash flow for the period
  SELECT COALESCE(SUM(net_cash_flow), 0) INTO v_cash_flow
  FROM public.daily_performance_snapshots
  WHERE date >= p_start_date AND date <= p_end_date;
  -- Calculate PnL
  v_pnl := (COALESCE(v_end_equity, 0) - COALESCE(v_start_equity, 0)) - v_cash_flow;
  RETURN v_pnl;
END;
$$;

drop function if exists public.calculate_twr(uuid, date, date);

CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_start_date" "date", "p_end_date" "date") RETURNS numeric
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_start_index NUMERIC;
  v_end_index NUMERIC;
  v_twr NUMERIC;
BEGIN
  -- Get the equity index from the day before the start date
  SELECT equity_index INTO v_start_index
  FROM public.daily_performance_snapshots
  WHERE date < p_start_date
  ORDER BY date DESC
  LIMIT 1;
  -- If no prior snapshot, this is the first month.
  -- The starting index is conceptually 100 before the first day.
  IF v_start_index IS NULL THEN v_start_index := 100;
  END IF;
  -- Get the equity index at the end of the period
  SELECT equity_index INTO v_end_index
  FROM public.daily_performance_snapshots
  WHERE date <= p_end_date
  ORDER BY date DESC
  LIMIT 1;
  -- If there's no data for the period, return 0
  IF v_end_index IS NULL THEN RETURN 0;
  END IF;
  -- Calculate TWR as the percentage change in the equity index
  v_twr := (v_end_index / v_start_index) - 1;
  RETURN v_twr;
END;
$$;

drop function if exists public.generate_performance_snapshots(uuid, date, date);

drop policy if exists "Users can access their performance snapshots" on "public"."daily_performance_snapshots";

create policy "Logged in users can access performance snapshots"
on "public"."daily_performance_snapshots"
to authenticated
using (true);

alter table public.daily_performance_snapshots
drop column user_id;

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
        a.security_id,
        s.asset_class,
        s.currency_code,
        SUM(tl.quantity) as total_quantity
      FROM transaction_legs tl
      JOIN transactions t ON tl.transaction_id = t.id
      JOIN assets a ON tl.asset_id = a.id
      JOIN securities s ON a.security_id = s.id
      WHERE t.transaction_date <= loop_date
        AND s.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.security_id, s.asset_class, s.currency_code
    )
    SELECT COALESCE(SUM(
      CASE
        WHEN ua.asset_class = 'stock' THEN ua.total_quantity * sdp.price
        WHEN ua.asset_class = 'crypto' THEN ua.total_quantity * COALESCE(dcp.price, 0) * COALESCE(er_usd.rate, 1)
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
      SELECT price FROM daily_crypto_prices
      WHERE security_id = ua.security_id AND date <= loop_date
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
          JOIN securities s ON a.security_id = s.id
          WHERE t.related_debt_id = d.id
            AND t.transaction_date <= loop_date
            AND s.ticker = 'DEBTS'
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
    JOIN securities s ON a.security_id = s.id
    WHERE t.transaction_date = loop_date
      AND t.type IN ('deposit', 'withdraw')
      AND s.asset_class IN ('cash', 'epf');
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