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
        WHEN ua.asset_class = 'crypto' THEN ua.total_quantity * COALESCE(dcp.price, 0) * COALESCE(er_usd.rate, 1)
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
      AND a.asset_class IN ('cash', 'fund');
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

CREATE OR REPLACE FUNCTION "public"."get_balance_sheet"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
  -- Cost basis values
  asset_cb_by_class jsonb;
  total_assets_cb numeric;
  
  -- Market value values
  asset_mv_by_class jsonb;
  total_assets_mv numeric;
  
  -- Liability values
  debts_principal numeric;
  accrued_interest numeric;
  liability_total numeric;
  
  -- Equity values
  owner_capital numeric;
  unrealized_pl numeric;
  equity_total numeric;
BEGIN
  -- Calculate cost basis totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(cb_totals.asset_class, cb_totals.total), '{}'::jsonb)
  INTO asset_cb_by_class
  FROM (
    SELECT a.asset_class, sum(tl.amount) as total
    FROM public.transaction_legs tl
    JOIN public.assets a ON tl.asset_id = a.id
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) as cb_totals;
  -- Calculate market value totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(mv_totals.asset_class, mv_totals.total), '{}'::jsonb)
  INTO asset_mv_by_class
  FROM (
    SELECT
      a.asset_class,
      SUM(
        CASE
          WHEN a.asset_class = 'stock' THEN a.current_quantity * COALESCE(public.get_latest_stock_price(a.id), 0)
          WHEN a.asset_class = 'crypto' THEN a.current_quantity * COALESCE(public.get_latest_crypto_price(a.id), 0) * COALESCE(public.get_latest_exchange_rate('USD'), 1)
          ELSE a.current_quantity * COALESCE(public.get_latest_exchange_rate(a.currency_code), 1)
        END
      ) AS total
    FROM public.assets a
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) as mv_totals;
  -- Calculate total asset cost basis
  total_assets_cb := (coalesce((asset_cb_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'fund')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'crypto')::numeric, 0));
  -- Calculate total asset market value
  total_assets_mv := (coalesce((asset_mv_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'fund')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'crypto')::numeric, 0));
  -- Calculate liability values
  SELECT a.current_quantity * -1 INTO debts_principal
  FROM public.assets a
  WHERE a.ticker = 'DEBTS';
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM public.debts d
  WHERE d.is_active;
  liability_total := debts_principal + accrued_interest;
  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  WHERE a.ticker = 'CAPITAL';
  unrealized_pl := total_assets_mv - total_assets_cb - accrued_interest;
  equity_total := owner_capital + unrealized_pl;
  
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_mv_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_mv_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'Fund', 'totalAmount', coalesce((asset_mv_by_class->>'fund')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_mv_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', total_assets_mv,
    'liabilities', json_build_array(
      json_build_object('type', 'Debts Principal', 'totalAmount', debts_principal),
      json_build_object('type', 'Accrued Interest', 'totalAmount', accrued_interest)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Owner Capital', 'totalAmount', owner_capital),
      json_build_object('type', 'Unrealized P/L', 'totalAmount', unrealized_pl)
    ),
    'totalEquity', equity_total
  ) INTO result;
  RETURN result;
END;
$$;