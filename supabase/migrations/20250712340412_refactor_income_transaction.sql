CREATE TYPE "public"."account_type" AS ENUM (
    'brokerage',
    'crypto_exchange',
    'epf',
    'bank',
    'wallet',
    'conceptual'
);
CREATE TYPE "public"."asset_class" AS ENUM (
    'cash',
    'stock',
    'crypto',
    'epf',
    'equity',
    'liability'
);
CREATE TYPE "public"."currency_type" AS ENUM (
    'fiat',
    'crypto'
);
CREATE TYPE "public"."debt_status" AS ENUM (
    'active',
    'paid_off'
);
CREATE TYPE "public"."tax_lot_origin" AS ENUM (
    'purchase',
    'split',
    'deposit'
);
CREATE TYPE "public"."transaction_type" AS ENUM (
    'buy',
    'sell',
    'deposit',
    'withdraw',
    'expense',
    'income',
    'dividend',
    'debt_payment',
    'split',
    'borrow'
);
CREATE OR REPLACE FUNCTION "public"."calculate_twr"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
    v_twr numeric := 1.0;
    v_hpr numeric;
    r record;
    v_bmv numeric;
    v_emv numeric;
    v_cf numeric;
    v_prev_emv numeric;
    v_last_bmv numeric; -- Track the BMV for the final period
begin
    -- Get the beginning market value from the day before the start date
    select net_equity_value::numeric into v_prev_emv
    from daily_performance_snapshots
    where user_id = p_user_id and date <= p_start_date - interval '1 day'
    order by date desc
    limit 1;
    -- If no data for the day before, use the first day's value before any cash flow
    if v_prev_emv is null then
        select (net_equity_value::numeric - net_cash_flow::numeric) into v_prev_emv
        from daily_performance_snapshots
        where user_id = p_user_id and date >= p_start_date
        order by date asc
        limit 1;
    end if;
    
    -- Initialize BMV for the first period
    v_bmv := v_prev_emv;
    v_last_bmv := v_bmv; -- Track for final period calculation
    for r in
        select
            date,
            net_equity_value::numeric as net_equity_value,
            net_cash_flow::numeric as net_cash_flow
        from daily_performance_snapshots
        where user_id = p_user_id
          and date between p_start_date and p_end_date
        order by date
    loop
        -- If there is a cash flow, calculate the HPR for the sub-period ending today
        if r.net_cash_flow != 0 then
            -- EMV for the sub-period is the equity value *before* the cash flow
            v_emv := r.net_equity_value - r.net_cash_flow;
            
            -- Calculate HPR for this sub-period
            if v_bmv != 0 then
                v_hpr := (v_emv - v_bmv) / v_bmv;
                v_twr := v_twr * (1 + v_hpr);
            end if;
            
            -- The new BMV for the next sub-period is the equity value *after* the cash flow
            v_bmv := r.net_equity_value;
            v_last_bmv := v_bmv; -- Update tracking variable
        else
            -- No cash flow on this day, just update the last BMV for final calculation
            v_last_bmv := v_bmv;
        end if;
    end loop;
    -- Final period calculation: from the last cash flow date to the end date
    -- Use the final day's equity value as the ending market value
    select net_equity_value::numeric into v_emv
    from daily_performance_snapshots
    where user_id = p_user_id and date <= p_end_date
    order by date desc
    limit 1;
    -- Calculate the final period return
    if v_last_bmv != 0 and v_emv is not null then
        v_hpr := (v_emv - v_last_bmv) / v_last_bmv;
        v_twr := v_twr * (1 + v_hpr);
    end if;
    -- Return the time-weighted return as a percentage (subtract 1 to get the return rate)
    return (v_twr - 1);
end;
$$;
CREATE OR REPLACE FUNCTION "public"."generate_performance_snapshots"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS "void"
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
CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_balance NUMERIC(16,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);
    RETURN v_balance;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_asset_summary"() RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
  
  -- Cost basis totals
  asset_totals_by_class jsonb;
  asset_totals_by_ticker jsonb;
  
  -- Market value totals
  asset_market_totals_by_class jsonb;
  total_assets_market_value numeric;
  
  -- Liability values
  loans_payable numeric;
  margins_payable numeric;
  accrued_interest numeric;
  liability_total numeric;
  
  -- Equity values
  capital_total numeric;
  earnings_total numeric;
  unrealized_pl numeric;
  equity_total numeric;
  
  -- Asset values
  assets_total_cost numeric;
BEGIN
  -- Calculate cost basis totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(class_totals.asset_class, class_totals.total), '{}'::jsonb)
  INTO asset_totals_by_class
  FROM (
    SELECT s.asset_class, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = auth.uid()
      AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as class_totals;
  -- Calculate market value totals by asset class
  SELECT COALESCE(jsonb_object_agg(market_totals.asset_class, market_totals.market_value), '{}'::jsonb)
  INTO asset_market_totals_by_class
  FROM (
      SELECT
        s.asset_class,
        SUM(
          CASE
            WHEN s.asset_class = 'stock' THEN COALESCE(qty.total_quantity, 0) * COALESCE(public.get_latest_stock_price(s.id), 0)
            ELSE COALESCE(qty.total_quantity, 0) * COALESCE(public.get_latest_exchange_rate(s.currency_code), 1)
          END
        ) AS market_value
      FROM
        assets a
      JOIN securities s ON a.security_id = s.id
      LEFT JOIN
        (SELECT asset_id, SUM(quantity) AS total_quantity
         FROM transaction_legs
         JOIN transactions t ON transaction_legs.transaction_id = t.id
         WHERE t.user_id = auth.uid()
         GROUP BY asset_id) AS qty ON a.id = qty.asset_id
      WHERE a.user_id = auth.uid() AND s.asset_class NOT IN ('equity', 'liability')
      GROUP BY s.asset_class
  ) as market_totals;
  -- Calculate totals by ticker for equity/liability accounts
  SELECT COALESCE(jsonb_object_agg(ticker_totals.ticker, ticker_totals.total), '{}'::jsonb)
  INTO asset_totals_by_ticker
  FROM (
    SELECT s.ticker, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = auth.uid()
    GROUP BY s.ticker
  ) as ticker_totals;
  -- Calculate total asset cost basis
  assets_total_cost := (coalesce((asset_totals_by_class->>'cash')::numeric, 0)) +
                     (coalesce((asset_totals_by_class->>'stock')::numeric, 0)) +
                     (coalesce((asset_totals_by_class->>'epf')::numeric, 0)) +
                     (coalesce((asset_totals_by_class->>'crypto')::numeric, 0));
  -- Calculate total asset market value
  total_assets_market_value := (coalesce((asset_market_totals_by_class->>'cash')::numeric, 0)) +
                               (coalesce((asset_market_totals_by_class->>'stock')::numeric, 0)) +
                               (coalesce((asset_market_totals_by_class->>'epf')::numeric, 0)) +
                               (coalesce((asset_market_totals_by_class->>'crypto')::numeric, 0));
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM debts d
  WHERE d.user_id = auth.uid() AND d.status = 'active';
  -- Calculate liability values
  loans_payable := (coalesce((asset_totals_by_ticker->>'LOANS_PAYABLE')::numeric, 0)) * -1;
  margins_payable := CASE WHEN (coalesce((asset_market_totals_by_class->>'cash')::numeric, 0)) < 0 THEN abs((coalesce((asset_market_totals_by_class->>'cash')::numeric, 0))) ELSE 0 END;
  liability_total := loans_payable + margins_payable + accrued_interest;
  -- Calculate equity values
  capital_total := (coalesce((asset_totals_by_ticker->>'CAPITAL')::numeric, 0)) * -1;
  earnings_total := (coalesce((asset_totals_by_ticker->>'EARNINGS')::numeric, 0)) * -1;
  unrealized_pl := total_assets_market_value - assets_total_cost - accrued_interest;
  equity_total := capital_total + earnings_total + unrealized_pl;
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_market_totals_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_market_totals_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_market_totals_by_class->>'epf')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_market_totals_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', total_assets_market_value,
    'liabilities', json_build_array(
      json_build_object('type', 'Loans Payable', 'totalAmount', loans_payable),
      json_build_object('type', 'Margins Payable', 'totalAmount', margins_payable),
      json_build_object('type', 'Accrued Interest', 'totalAmount', accrued_interest)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Paid-in Capital', 'totalAmount', capital_total),
      json_build_object('type', 'Retained Earnings', 'totalAmount', earnings_total),
      json_build_object('type', 'Unrealized P/L', 'totalAmount', unrealized_pl)
    ),
    'totalEquity', equity_total
  ) INTO result;
  RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_equity_chart_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    data_count INT;
    -- LTTB implementation variables
    data RECORD;
    result_data RECORD;
    avg_x NUMERIC;
    avg_y NUMERIC;
    range_start INT;
    range_end INT;
    point_area NUMERIC;
    max_area NUMERIC;
    point_to_add RECORD;
    every NUMERIC;
    i INT;
    a INT := 0;
BEGIN
    -- Create a temporary table to hold the raw data, casting the value to numeric
    CREATE TEMP TABLE raw_data AS
    SELECT
        dps.date,
        dps.net_equity_value::numeric as net_equity_value,
        ROW_NUMBER() OVER (ORDER BY dps.date) as rn
    FROM
        daily_performance_snapshots dps
    WHERE
        dps.user_id = p_user_id
        AND dps.date >= p_start_date
        AND dps.date <= p_end_date
    ORDER BY
        dps.date;
    SELECT COUNT(*) INTO data_count FROM raw_data;
    -- If the data count is below the threshold, return all points
    IF data_count <= p_threshold THEN
        RETURN QUERY SELECT rd.date, rd.net_equity_value FROM raw_data rd;
        DROP TABLE raw_data;
        RETURN;
    END IF;
    -- LTTB Downsampling
    CREATE TEMP TABLE result_data_temp (
        date DATE,
        net_equity_value NUMERIC
    );
    -- Always add the first point
    INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = 1;
    every := (data_count - 2.0) / (p_threshold - 2.0);
    FOR i IN 0..p_threshold - 3 LOOP
        -- Calculate average for the next bucket
        range_start := floor(a * every) + 2;
        range_end := floor((a + 1) * every) + 1;
        SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        SELECT AVG(rd.net_equity_value) INTO avg_y FROM raw_data rd WHERE rn >= range_start AND rn <= range_end;
        -- Find the point with the largest triangle area
        max_area := -1;
        -- Get the last point added to the results
        SELECT * INTO result_data FROM result_data_temp ORDER BY date DESC LIMIT 1;
        FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
            point_area := abs(
                (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.net_equity_value - result_data.net_equity_value) -
                (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.net_equity_value)
            ) * 0.5;
            IF point_area > max_area THEN
                max_area := point_area;
                point_to_add := data;
            END IF;
        END LOOP;
        -- Add the selected point to the results
        INSERT INTO result_data_temp (date, net_equity_value)
        VALUES (point_to_add.date, point_to_add.net_equity_value);
        a := a + 1;
    END LOOP;
    -- Always add the last point
    INSERT INTO result_data_temp SELECT rd.date, rd.net_equity_value FROM raw_data rd WHERE rn = data_count;
    RETURN QUERY SELECT * FROM result_data_temp ORDER BY date;
    DROP TABLE raw_data;
    DROP TABLE result_data_temp;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_latest_exchange_rate"("p_currency_code" "text") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  latest_rate NUMERIC;
BEGIN
  SELECT rate
  INTO latest_rate
  FROM public.daily_exchange_rates
  WHERE currency_code = p_currency_code
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_rate;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_latest_stock_price"("p_security_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT price
  INTO latest_price
  FROM public.daily_stock_prices
  WHERE security_id = p_security_id
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_price;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_monthly_pnl"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "pnl" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;
CREATE OR REPLACE FUNCTION "public"."get_performance_benchmark_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("date" "text", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_first_portfolio_value numeric;
    v_first_vni_value numeric;
BEGIN
    -- Step 1: Find the first available values on or after the start date for normalization
    SELECT dps.equity_index INTO v_first_portfolio_value
    FROM daily_performance_snapshots dps
    WHERE dps.user_id = p_user_id AND dps.date >= p_start_date
    ORDER BY dps.date
    LIMIT 1;
    SELECT md.close INTO v_first_vni_value
    FROM daily_market_indices md
    WHERE md.symbol = '^VNINDEX' AND md.date >= p_start_date
    ORDER BY md.date
    LIMIT 1;
    -- Step 2: Fetch, join, and normalize the data
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as day
    ),
    portfolio_data AS (
        SELECT
            dps.date,
            dps.equity_index
        FROM daily_performance_snapshots dps
        WHERE dps.user_id = p_user_id AND dps.date BETWEEN p_start_date AND p_end_date
    ),
    vni_data AS (
        SELECT
            md.date,
            md.close
        FROM daily_market_indices md
        WHERE md.symbol = '^VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
    )
    SELECT
        to_char(ds.day, 'YYYY-MM-DD') as date,
        -- Normalize portfolio value
        (pd.equity_index / v_first_portfolio_value) * 100 as portfolio_value,
        -- Normalize VNI value
        (vni.close / v_first_vni_value) * 100 as vni_value
    FROM date_series ds
    LEFT JOIN portfolio_data pd ON ds.day = pd.date
    LEFT JOIN vni_data vni ON ds.day = vni.date
    WHERE pd.equity_index IS NOT NULL OR vni.close IS NOT NULL -- Only return days with any data
    ORDER BY ds.day;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.ticker,
        s.name,
        'https://s3-symbol-logo.tradingview.com/' || s.logo_url || '--big.svg' AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        public.get_latest_stock_price(s.id) AS latest_price
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'stock' AND a.user_id = auth.uid()
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" "uuid", "transaction_date" "date", "type" "text", "description" "text", "ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "amount" numeric, "currency_code" "text", "net_sold" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_offset integer;
BEGIN
    -- Calculate the offset for pagination
    v_offset := (page_number - 1) * page_size;
    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.type::text,
        t.description,
        s.ticker,
        s.name,
        CASE
            WHEN s.logo_url IS NOT NULL THEN 'https://s3-symbol-logo.tradingview.com/' || s.logo_url || '--big.svg'
            ELSE NULL
        END,
        tl.quantity,
        tl.amount,
        tl.currency_code::text,
        CASE
            WHEN t.type = 'sell' THEN (
                SELECT td.price * ABS(tl.quantity) - td.fees - td.taxes
                FROM public.transaction_details td
                WHERE td.transaction_id = t.id
            )
            ELSE NULL
        END AS net_sold
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    JOIN
        public.securities s ON a.security_id = s.id
    WHERE
        t.user_id = auth.uid() AND
        s.asset_class NOT IN ('equity', 'liability') AND
        NOT (s.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell')) AND
        (start_date IS NULL OR t.transaction_date >= start_date) AND
        (end_date IS NULL OR t.transaction_date <= end_date) AND
        (asset_class_filter IS NULL OR s.asset_class::text = asset_class_filter)
    ORDER BY
        t.transaction_date DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric, "p_interest_rate" numeric, "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_loans_payable_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
    v_liability_currency_code text;
    v_loans_payable_security_id uuid;
BEGIN
    -- 1. Get or create the 'Loans Payable' security and the user's corresponding asset
    SELECT id, currency_code INTO v_loans_payable_security_id, v_liability_currency_code
    FROM securities
    WHERE ticker = 'LOANS_PAYABLE'
    LIMIT 1;
    IF v_loans_payable_security_id IS NULL THEN
        -- This should ideally be pre-seeded, but we can create it as a fallback.
        SELECT display_currency INTO v_liability_currency_code FROM profiles WHERE id = p_user_id;
        INSERT INTO securities (asset_class, ticker, name, currency_code)
        VALUES ('liability', 'LOANS_PAYABLE', 'Loans Payable', v_liability_currency_code)
        RETURNING id INTO v_loans_payable_security_id;
    END IF;
    SELECT id INTO v_loans_payable_asset_id
    FROM assets
    WHERE user_id = p_user_id AND security_id = v_loans_payable_security_id;
    IF v_loans_payable_asset_id IS NULL THEN
        INSERT INTO assets (user_id, security_id)
        VALUES (p_user_id, v_loans_payable_security_id)
        RETURNING id INTO v_loans_payable_asset_id;
    END IF;
    -- 2. Get the conceptual 'Liability' account
    SELECT id INTO v_loans_payable_account_id
    FROM accounts
    WHERE user_id = p_user_id AND name = 'Liability' AND type = 'conceptual'
    LIMIT 1;
    IF v_loans_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Liability conceptual account not found for user %', p_user_id;
    END IF;
    -- 3. Get the currency of the cash asset that will receive the funds
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Specified cash asset not found for account %', p_deposit_account_id;
    END IF;
    -- 4. Create the debt record
    INSERT INTO debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
    VALUES (p_user_id, p_lender_name, p_principal_amount, v_cash_asset_currency_code, p_interest_rate, p_transaction_date, 'active')
    RETURNING id INTO v_debt_id;
    -- 5. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'borrow', p_description, v_debt_id)
    RETURNING id INTO v_transaction_id;
    -- 6. Create the transaction legs
    -- Debit the deposit account (increase cash)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_deposit_account_id, p_cash_asset_id, p_principal_amount, p_principal_amount, v_cash_asset_currency_code);
    -- Credit the Loans Payable liability account (increase liability)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, v_loans_payable_account_id, v_loans_payable_asset_id, p_principal_amount * -1, p_principal_amount * -1, v_liability_currency_code);
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_bulk_transaction_import"("p_user_id" "uuid", "p_transactions_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_record jsonb;
    v_transaction_type text;
    v_asset_id uuid;
    v_cash_asset_id uuid;
    v_dividend_asset_id uuid;
    v_account_id uuid;
    v_debt_id uuid;
    v_asset_ticker text;
    v_cash_asset_ticker text;
    v_dividend_asset_ticker text;
    v_account_name text;
    v_lender_name text;
    v_security_id uuid;
BEGIN
    IF NOT jsonb_typeof(p_transactions_data) = 'array' THEN RAISE EXCEPTION 'Input must be a JSON array of transactions.'; END IF;
    FOR v_transaction_record IN SELECT * FROM jsonb_array_elements(p_transactions_data)
    LOOP
        v_transaction_type := v_transaction_record->>'type';
        v_asset_ticker := v_transaction_record->>'asset_ticker';
        v_cash_asset_ticker := v_transaction_record->>'cash_asset_ticker';
        v_dividend_asset_ticker := v_transaction_record->>'dividend_asset_ticker';
        v_account_name := v_transaction_record->>'account';
        IF v_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_asset_ticker; END IF;
            SELECT id INTO v_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_asset_ticker; END IF;
        END IF;
        IF v_cash_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_cash_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_cash_asset_ticker; END IF;
            SELECT id INTO v_cash_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_cash_asset_id IS NULL THEN RAISE EXCEPTION 'Asset for ticker % not found for user.', v_cash_asset_ticker; END IF;
        END IF;
        IF v_dividend_asset_ticker IS NOT NULL THEN
            SELECT id INTO v_security_id FROM public.securities WHERE ticker = v_dividend_asset_ticker;
            IF v_security_id IS NULL THEN RAISE EXCEPTION 'Security with ticker % not found.', v_dividend_asset_ticker; END IF;
            SELECT id INTO v_dividend_asset_id FROM public.assets WHERE security_id = v_security_id AND user_id = p_user_id;
            IF v_dividend_asset_id IS NULL THEN RAISE EXCEPTION 'Dividend-paying asset for ticker % not found for user.', v_dividend_asset_ticker; END IF;
        END IF;
        IF v_account_name IS NOT NULL THEN
            SELECT id INTO v_account_id FROM public.accounts WHERE name = v_account_name AND user_id = p_user_id;
            IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account with name % not found.', v_account_name; END IF;
        END IF;
        CASE v_transaction_type
            WHEN 'buy' THEN
                PERFORM "public"."handle_buy_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, v_asset_id, v_cash_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'price')::numeric(16,2), (v_transaction_record->>'fees')::numeric(16,2), v_transaction_record->>'description');
            WHEN 'sell' THEN
                PERFORM "public"."handle_sell_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'quantity')::numeric * (v_transaction_record->>'price')::numeric, (v_transaction_record->>'fees')::numeric(16,2), (v_transaction_record->>'taxes')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'deposit' THEN
                PERFORM "public"."handle_deposit_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'withdraw' THEN
                PERFORM "public"."handle_withdraw_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'debt_payment' THEN
                v_lender_name := v_transaction_record->>'counterparty';
                SELECT id INTO v_debt_id FROM public.debts WHERE lender_name = v_lender_name AND user_id = p_user_id AND status = 'active';
                IF v_debt_id IS NULL THEN RAISE EXCEPTION 'Active debt for lender % not found.', v_lender_name; END IF;
                PERFORM "public"."handle_debt_payment_transaction"(p_user_id, v_debt_id, (v_transaction_record->>'principal_payment')::numeric(16,2), (v_transaction_record->>'interest_payment')::numeric(16,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'income' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_asset_id, 'income');
            WHEN 'dividend' THEN
                PERFORM "public"."handle_income_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'quantity')::numeric(16,2), v_transaction_record->>'description', v_cash_asset_id, 'dividend');
            WHEN 'expense' THEN
                PERFORM "public"."handle_expense_transaction"(p_user_id, (v_transaction_record->>'date')::date, v_account_id, (v_transaction_record->>'amount')::numeric(16,2), v_transaction_record->>'description', v_asset_id);
            WHEN 'borrow' THEN
                PERFORM "public"."handle_borrow_transaction"(p_user_id, v_transaction_record->>'counterparty', (v_transaction_record->>'amount')::numeric(16,2), (v_transaction_record->>'interest_rate')::numeric(4,2), (v_transaction_record->>'date')::date, v_account_id, v_cash_asset_id, v_transaction_record->>'description');
            WHEN 'split' THEN
                PERFORM "public"."handle_split_transaction"(p_user_id, v_asset_id, (v_transaction_record->>'quantity')::numeric(16,2), (v_transaction_record->>'date')::date, v_transaction_record->>'description');
            ELSE
                RAISE EXCEPTION 'Unknown transaction type: %', v_transaction_type;
        END CASE;
    END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" numeric, "p_price" numeric, "p_fees" numeric, "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id uuid;
    v_cost_of_purchase_foreign_currency numeric(16,2);
    v_cash_asset_currency_code text;
    v_purchased_asset_currency_code text;
    v_exchange_rate numeric;
    v_cost_basis_purchased_asset_vnd numeric(16,2);
    -- FX Gain/Loss variables
    v_cost_basis_cash_spent_vnd numeric(16,2) := 0;
    v_realized_gain_loss_vnd numeric(16,2);
    v_remaining_quantity_to_spend numeric(16,2);
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_cash_asset_leg_id uuid;
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_equity_account_id UUID;
    v_retained_earnings_security_id UUID;
BEGIN
    -- 1. Get currency codes for purchased asset and cash asset
    SELECT s.currency_code INTO v_purchased_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id;
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;
    -- 2. Calculate the total cost of the transaction in the foreign currency
    v_cost_of_purchase_foreign_currency := (p_quantity * p_price) + p_fees;
    -- 3. Handle FX Gain/Loss if cash asset is not in VND
    IF v_cash_asset_currency_code != 'VND' THEN
        -- Get exchange rate to VND
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
        END IF;
        v_cost_basis_purchased_asset_vnd := v_cost_of_purchase_foreign_currency * v_exchange_rate;
        -- Consume tax lots of the cash asset
        v_remaining_quantity_to_spend := v_cost_of_purchase_foreign_currency;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
        FOR v_lot IN
            SELECT * FROM tax_lots
            WHERE user_id = p_user_id AND asset_id = p_cash_asset_id AND remaining_quantity > 0
            ORDER BY creation_date ASC
        LOOP
            IF v_remaining_quantity_to_spend <= 0 THEN EXIT; END IF;
            v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
            v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
            UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
            INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
            v_cost_basis_cash_spent_vnd := v_cost_basis_cash_spent_vnd + v_cost_basis_from_lot;
            v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
        END LOOP;
        IF v_remaining_quantity_to_spend > 0 THEN
            RAISE EXCEPTION 'Not enough cash for purchase. Tried to spend %, but only % was available.', v_cost_of_purchase_foreign_currency, (v_cost_of_purchase_foreign_currency - v_remaining_quantity_to_spend);
        END IF;
        -- Get Retained Earnings asset and Equity account
        SELECT id INTO v_retained_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_retained_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
        IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.'; END IF;
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'buy', p_description)
        RETURNING id INTO v_transaction_id;
        -- Calculate realized gain/loss
        v_realized_gain_loss_vnd := v_cost_basis_purchased_asset_vnd - v_cost_basis_cash_spent_vnd;
        -- Create transaction legs
        -- Credit the cash asset at its cost basis
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_of_purchase_foreign_currency * -1, v_cost_basis_cash_spent_vnd * -1, v_cash_asset_currency_code)
        RETURNING id INTO v_cash_asset_leg_id;
        
        -- Debit the purchased asset
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis_purchased_asset_vnd, v_purchased_asset_currency_code);
        -- Credit/Debit Retained Earnings with the realized FX gain/loss
        IF v_realized_gain_loss_vnd != 0 THEN
             INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
             VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss_vnd * -1, v_realized_gain_loss_vnd * -1, v_retained_earnings_currency_code);
        END IF;
        -- Create lot consumptions
        FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
            INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
            VALUES (v_cash_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
        END LOOP;
    ELSE -- Standard buy logic for VND
        v_cost_basis_purchased_asset_vnd := v_cost_of_purchase_foreign_currency;
        INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'buy', p_description) RETURNING id INTO v_transaction_id;
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
            (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_of_purchase_foreign_currency * -1, v_cost_basis_purchased_asset_vnd * -1, v_cash_asset_currency_code),
            (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis_purchased_asset_vnd, v_purchased_asset_currency_code);
    END IF;
    -- 4. Create tax lot for the purchased asset
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis_purchased_asset_vnd);
    -- 5. Create transaction details
    INSERT INTO transaction_details (transaction_id, price, fees, taxes)
    VALUES (v_transaction_id, p_price, p_fees, 0);
    RETURN v_transaction_id;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric, "p_interest_payment" numeric, "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id uuid;
    v_loans_payable_asset_id uuid;
    v_total_payment numeric(16,2);
    v_cash_asset_currency_code text;
    v_liability_currency_code text;
    v_liability_balance numeric(16,2);
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_equity_account_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
    v_loans_payable_security_id uuid;
    v_earnings_security_id uuid;
    v_capital_security_id uuid;
BEGIN
    -- 1. Look up security IDs
    SELECT id INTO v_loans_payable_security_id FROM public.securities WHERE ticker = 'LOANS_PAYABLE';
    SELECT id INTO v_earnings_security_id FROM public.securities WHERE ticker = 'EARNINGS';
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    -- 2. Look up user-specific asset IDs
    SELECT id INTO v_loans_payable_asset_id FROM public.assets WHERE security_id = v_loans_payable_security_id AND user_id = p_user_id;
    SELECT a.id, s.currency_code INTO v_earnings_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_earnings_security_id AND a.user_id = p_user_id;
    SELECT a.id, s.currency_code INTO v_capital_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
    IF v_loans_payable_asset_id IS NULL OR v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Core equity/liability assets not found for user %', p_user_id;
    END IF;
    -- 3. Get the currency of the cash asset being used for payment
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find specified cash asset with ID %', p_cash_asset_id;
    END IF;
    
    SELECT s.currency_code INTO v_liability_currency_code FROM public.securities s WHERE s.id = v_loans_payable_security_id;
    -- 4. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;
    -- 5. Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;
    -- 6. Determine amounts to draw from each equity component for the interest payment
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    IF v_earnings_balance < 0 THEN
        v_draw_from_earnings := LEAST(p_interest_payment, ABS(v_earnings_balance));
    ELSE
        v_draw_from_earnings := 0;
    END IF;
    v_draw_from_capital := p_interest_payment - v_draw_from_earnings;
    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Interest payment exceeds available capital.';
        END IF;
    END IF;
    -- 7. Create a new transactions record
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'debt_payment', p_description, p_debt_id)
    RETURNING id INTO v_transaction_id;
    -- 8. Create the transaction legs
    -- Credit: Decrease cash from the paying account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_from_account_id, p_cash_asset_id, v_total_payment * -1, v_total_payment * -1, v_cash_asset_currency_code);
    -- Debit: Decrease the "Loans Payable" liability for the principal portion
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id), v_loans_payable_asset_id, p_principal_payment, p_principal_payment, v_liability_currency_code);
    -- Debit: Decrease Retained Earnings for the interest portion
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;
    -- Debit: Decrease Paid-in Capital for the interest portion if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
    -- 9. Check if the debt is now paid off by checking the balance of the liability legs
    SELECT COALESCE(SUM(tl.quantity), 0) INTO v_liability_balance
    FROM transaction_legs tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE t.related_debt_id = p_debt_id AND tl.asset_id = v_loans_payable_asset_id;
    -- If the balance is 0 or positive, the debt is considered paid off.
    IF v_liability_balance >= 0 THEN
        UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
    v_calculated_amount numeric(16,2);
    v_asset_currency_code text;
    v_asset_class text;
    v_capital_security_id UUID;
    v_exchange_rate numeric;
BEGIN
    -- Get asset details
    SELECT s.currency_code, s.asset_class
    INTO v_asset_currency_code, v_asset_class
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;
    -- Calculate the amount
    IF v_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_asset_currency_code
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find exchange rate for ' || v_asset_currency_code);
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get capital asset and equity account
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    IF v_capital_security_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' security.'); END IF;
    SELECT id INTO v_capital_asset_id FROM public.assets WHERE security_id = v_capital_security_id AND user_id = p_user_id;
    IF v_capital_asset_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset for user.'); END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.'); END IF;
    -- Create transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'deposit', p_description)
    RETURNING id INTO v_transaction_id;
    -- Create transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_calculated_amount, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, p_quantity * -1, v_calculated_amount * -1, v_asset_currency_code);
    -- Create tax lot for non-VND cash assets
    -- TODO: In the future, handle non-cash assets like stocks and crypto by fetching their market price.
    IF (v_asset_class = 'cash' or v_asset_class = 'epf') AND v_asset_currency_code != 'VND' THEN
        INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
    END IF;
    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
    v_earnings_security_id UUID;
    v_capital_security_id UUID;
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_calculated_amount numeric(16,2);
    v_exchange_rate numeric;
    -- FX Gain/Loss variables
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_remaining_quantity_to_spend numeric(16,2);
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_asset_leg_id uuid;
BEGIN
    -- 1. Get the currency of the cash asset being spent
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset.';
    END IF;
    -- 2. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;
    -- 3. Calculate the amount in the base currency
    IF v_cash_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- 4. FX Gain/Loss logic for non-VND cash expenses
    IF v_cash_asset_currency_code != 'VND' THEN
        v_remaining_quantity_to_spend := p_quantity;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
        -- Get Retained Earnings asset
        SELECT id INTO v_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        -- Consume tax lots
        FOR v_lot IN
            SELECT * FROM tax_lots
            WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
            ORDER BY creation_date ASC
        LOOP
            IF v_remaining_quantity_to_spend <= 0 THEN EXIT; END IF;
            v_quantity_from_lot := LEAST(v_remaining_quantity_to_spend, v_lot.remaining_quantity);
            v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
            UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
            INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
            v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
            v_remaining_quantity_to_spend := v_remaining_quantity_to_spend - v_quantity_from_lot;
        END LOOP;
        IF v_remaining_quantity_to_spend > 0 THEN
            RAISE EXCEPTION 'Not enough cash for expense. Tried to spend %, but only % was available.', p_quantity, (p_quantity - v_remaining_quantity_to_spend);
        END IF;
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'expense', p_description)
        RETURNING id INTO v_transaction_id;
        v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
        -- Create balanced transaction legs
        -- Credit the cash asset at its cost basis
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_total_cost_basis * -1, v_cash_asset_currency_code)
        RETURNING id INTO v_asset_leg_id;
        -- Credit Retained Earnings with the realized FX gain/loss
        IF v_realized_gain_loss != 0 THEN
             INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
             VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);
        END IF;
        -- Create lot consumptions
        FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
            INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
            VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
        END LOOP;
    ELSE -- Standard expense logic for VND
        -- Create the transaction
        INSERT INTO public.transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'expense', p_description)
        RETURNING id INTO v_transaction_id;
        -- Credit: Decrease cash from the source account
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_calculated_amount * -1, v_cash_asset_currency_code);
    END IF;
    -- 5. Determine amounts to draw from each equity component for the expense
    SELECT id INTO v_earnings_security_id FROM public.securities WHERE ticker = 'EARNINGS';
    SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
    SELECT a.id, s.currency_code INTO v_earnings_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_earnings_security_id AND a.user_id = p_user_id;
    SELECT a.id, s.currency_code INTO v_capital_asset FROM public.assets a JOIN public.securities s ON a.security_id = s.id WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.';
    END IF;
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    IF v_earnings_balance < 0 THEN
        v_draw_from_earnings := LEAST(v_calculated_amount, ABS(v_earnings_balance));
    ELSE
        v_draw_from_earnings := 0;
    END IF;
    v_draw_from_capital := v_calculated_amount - v_draw_from_earnings;
    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Expense amount exceeds available capital.';
        END IF;
    END IF;
    -- 6. Create equity transaction legs
    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;
    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid", "p_transaction_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
    v_retained_earnings_security_id uuid;
    v_asset_class text;
    v_calculated_amount numeric(16,2);
    v_exchange_rate numeric;
BEGIN
    -- Get asset details
    SELECT s.currency_code, s.asset_class
    INTO v_asset_currency_code, v_asset_class
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;
    -- Calculate the amount
    IF v_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_asset_currency_code, p_transaction_date;
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get the 'Retained Earnings' security for the user
    SELECT id INTO v_retained_earnings_security_id
    FROM securities
    WHERE ticker = 'EARNINGS'
    LIMIT 1;
    IF v_retained_earnings_security_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings security not found';
    END IF;
    -- Get the user's 'Retained Earnings' asset
    SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id
    LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;
    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, p_transaction_type::transaction_type, p_description)
    RETURNING id INTO v_transaction_id;
    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_calculated_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, v_calculated_amount * -1, v_calculated_amount * -1, v_retained_earnings_currency_code);
    -- Create tax lot for non-VND cash assets
    IF (v_asset_class = 'cash' or v_asset_class = 'epf') AND v_asset_currency_code != 'VND' THEN
        INSERT INTO public.tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_asset_id, v_transaction_id, 'deposit', p_transaction_date, p_quantity, p_quantity, v_calculated_amount);
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" numeric, "p_price" numeric, "p_fees" numeric, "p_taxes" numeric, "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id uuid;
    v_net_proceeds_foreign_currency numeric(16,2);
    v_cash_asset_currency_code text;
    v_sold_asset_currency_code text;
    v_exchange_rate numeric;
    v_proceeds_in_vnd numeric(16,2);
    
    -- Sell asset cost basis variables
    v_total_cost_basis_vnd numeric(16,2) := 0;
    v_realized_gain_loss_vnd numeric(16,2);
    v_remaining_quantity_to_sell numeric(16,2) := p_quantity_to_sell;
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot_vnd numeric(16,2);
    v_asset_leg_id uuid;
    
    -- Equity-related variables
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_equity_account_id UUID;
    v_retained_earnings_security_id UUID;
BEGIN
    -- 1. Get currency codes for sold asset and cash asset
    SELECT s.currency_code INTO v_sold_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id;
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.id = p_cash_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN RAISE EXCEPTION 'Could not find cash asset with ID %', p_cash_asset_id; END IF;
    -- 2. Calculate net proceeds and their value in VND
    v_net_proceeds_foreign_currency := (p_quantity_to_sell * p_price) - p_fees - p_taxes;
    IF v_cash_asset_currency_code != 'VND' THEN
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RAISE EXCEPTION 'Could not find exchange rate for % on or before %', v_cash_asset_currency_code, p_transaction_date;
        END IF;
        v_proceeds_in_vnd := v_net_proceeds_foreign_currency * v_exchange_rate;
    ELSE
        v_proceeds_in_vnd := v_net_proceeds_foreign_currency;
    END IF;
    -- 3. Consume tax lots of the sold asset to find its total cost basis in VND
    DROP TABLE IF EXISTS temp_consumed_lots;
    CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
    FOR v_lot IN
        SELECT * FROM tax_lots
        WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
        ORDER BY creation_date ASC
    LOOP
        IF v_remaining_quantity_to_sell <= 0 THEN EXIT; END IF;
        v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
        v_cost_basis_from_lot_vnd := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
        
        UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
        INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
        
        v_total_cost_basis_vnd := v_total_cost_basis_vnd + v_cost_basis_from_lot_vnd;
        v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
    END LOOP;
    IF v_remaining_quantity_to_sell > 0 THEN
        RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell);
    END IF;
    -- 4. Calculate realized gain/loss for the sold asset
    v_realized_gain_loss_vnd := v_proceeds_in_vnd - v_total_cost_basis_vnd;
    -- 5. Get Retained Earnings asset and Equity account
    SELECT id INTO v_retained_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
    IF v_retained_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
    SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets a JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND a.security_id = v_retained_earnings_security_id LIMIT 1;
    IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.'; END IF;
    -- 6. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'sell', p_description)
    RETURNING id INTO v_transaction_id;
    -- 7. Create balanced transaction legs (all amounts in VND)
    -- Debit the cash asset for the net proceeds
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_cash_asset_id, v_net_proceeds_foreign_currency, v_proceeds_in_vnd, v_cash_asset_currency_code);
    -- Credit the sold asset at its cost basis
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_asset_id, p_quantity_to_sell * -1, v_total_cost_basis_vnd * -1, v_sold_asset_currency_code)
    RETURNING id INTO v_asset_leg_id;
    -- Credit/Debit Retained Earnings with the realized gain/loss
    IF v_realized_gain_loss_vnd != 0 THEN
         INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
         VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss_vnd * -1, v_realized_gain_loss_vnd * -1, v_retained_earnings_currency_code);
    END IF;
    -- 8. Create lot consumptions for the sold asset
    FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
        INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
        VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
    END LOOP;
    -- 9. Create a new tax lot for the received cash asset if it's not in VND
    IF v_cash_asset_currency_code != 'VND' THEN
        INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
        VALUES (p_user_id, p_cash_asset_id, v_transaction_id, 'purchase', p_transaction_date, v_net_proceeds_foreign_currency, v_net_proceeds_foreign_currency, v_proceeds_in_vnd);
    END IF;
    -- 10. Create transaction details
    INSERT INTO transaction_details (transaction_id, price, fees, taxes)
    VALUES (v_transaction_id, p_price, p_fees, p_taxes);
    RETURN v_transaction_id;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id UUID;
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_asset_account_id UUID;
    v_asset_currency_code TEXT;
    v_capital_security_id UUID;
BEGIN
    SELECT id INTO v_equity_account_id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity' LIMIT 1;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id; END IF;
    SELECT id INTO v_capital_security_id FROM securities WHERE ticker = 'CAPITAL' LIMIT 1;
    IF v_capital_security_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' security not found'; END IF;
    SELECT id INTO v_capital_asset_id FROM assets WHERE user_id = p_user_id AND security_id = v_capital_security_id LIMIT 1;
    IF v_capital_asset_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id; END IF;
    SELECT tl.account_id, s.currency_code INTO v_asset_account_id, v_asset_currency_code
    FROM transaction_legs tl
    JOIN assets a ON a.id = tl.asset_id
    JOIN securities s ON a.security_id = s.id
    WHERE tl.asset_id = p_asset_id
    LIMIT 1;
    IF v_asset_account_id IS NULL THEN RAISE EXCEPTION 'Could not determine an account for asset %', p_asset_id; END IF;
    INSERT INTO transactions (user_id, transaction_date, type, description) VALUES (p_user_id, p_transaction_date, 'split', p_description) RETURNING id INTO v_transaction_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);
END;
$$;
CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_quantity" numeric, "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
    v_response JSONB;
    v_earnings_security_id UUID;
    v_capital_security_id UUID;
    v_retained_earnings_asset_id uuid;
    v_retained_earnings_currency_code text;
    v_calculated_amount numeric(16,2);
    v_exchange_rate numeric;
    -- FX Gain/Loss variables
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_remaining_quantity_to_withdraw numeric(16,2);
    v_lot record;
    v_quantity_from_lot numeric(16,2);
    v_cost_basis_from_lot numeric(16,2);
    v_asset_leg_id uuid;
BEGIN
    SELECT s.currency_code INTO v_cash_asset_currency_code
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE a.id = p_asset_id AND a.user_id = p_user_id;
    IF v_cash_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified cash asset.');
    END IF;
    -- Calculate the amount
    IF v_cash_asset_currency_code = 'VND' THEN
        v_calculated_amount := p_quantity;
    ELSE
        SELECT rate INTO v_exchange_rate
        FROM public.daily_exchange_rates
        WHERE currency_code = v_cash_asset_currency_code AND date <= p_transaction_date
        ORDER BY date DESC
        LIMIT 1;
        IF v_exchange_rate IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find exchange rate for ' || v_cash_asset_currency_code || ' on or before ' || p_transaction_date);
        END IF;
        v_calculated_amount := p_quantity * v_exchange_rate;
    END IF;
    -- Get Equity conceptual account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;
    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;
    -- FX Gain/Loss logic for non-VND cash withdrawal
    IF v_cash_asset_currency_code != 'VND' THEN
        v_remaining_quantity_to_withdraw := p_quantity;
        DROP TABLE IF EXISTS temp_consumed_lots;
        CREATE TEMP TABLE temp_consumed_lots (lot_id uuid, quantity_consumed numeric(16,2)) ON COMMIT DROP;
        -- Get Retained Earnings asset
        SELECT id INTO v_earnings_security_id FROM securities WHERE ticker = 'EARNINGS' LIMIT 1;
        IF v_earnings_security_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings security not found'; END IF;
        SELECT a.id, s.currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
        FROM assets a JOIN securities s ON a.security_id = s.id
        WHERE a.user_id = p_user_id AND a.security_id = v_earnings_security_id LIMIT 1;
        IF v_retained_earnings_asset_id IS NULL THEN RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id; END IF;
        -- Get Capital asset
        SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
        SELECT a.id, s.currency_code INTO v_capital_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
        IF v_capital_asset.id IS NULL THEN RAISE EXCEPTION 'Could not find ''Paid-in Capital'' asset for user.'; END IF;
        -- Consume tax lots
        FOR v_lot IN
            SELECT * FROM tax_lots
            WHERE user_id = p_user_id AND asset_id = p_asset_id AND remaining_quantity > 0
            ORDER BY creation_date ASC
        LOOP
            IF v_remaining_quantity_to_withdraw <= 0 THEN EXIT; END IF;
            v_quantity_from_lot := LEAST(v_remaining_quantity_to_withdraw, v_lot.remaining_quantity);
            v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;
            UPDATE tax_lots SET remaining_quantity = remaining_quantity - v_quantity_from_lot WHERE id = v_lot.id;
            INSERT INTO temp_consumed_lots (lot_id, quantity_consumed) VALUES (v_lot.id, v_quantity_from_lot);
            v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
            v_remaining_quantity_to_withdraw := v_remaining_quantity_to_withdraw - v_quantity_from_lot;
        END LOOP;
        IF v_remaining_quantity_to_withdraw > 0 THEN
            RAISE EXCEPTION 'Not enough cash to withdraw. Tried to withdraw %, but only % was available.', p_quantity, (p_quantity - v_remaining_quantity_to_withdraw);
        END IF;
        -- Create transaction
        INSERT INTO transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'withdraw', p_description)
        RETURNING id INTO v_transaction_id;
        v_realized_gain_loss := v_calculated_amount - v_total_cost_basis;
        -- Create balanced transaction legs
        -- Debit Capital (Owner's Draw) for the full current value
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_calculated_amount, v_calculated_amount, v_capital_asset.currency_code);
        -- Credit the cash asset at its cost basis
        INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_total_cost_basis * -1, v_cash_asset_currency_code)
        RETURNING id INTO v_asset_leg_id;
        -- Credit Retained Earnings with the realized FX gain/loss
        IF v_realized_gain_loss != 0 THEN
             INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
             VALUES (v_transaction_id, v_equity_account_id, v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);
        END IF;
        -- Create lot consumptions
        FOR v_lot IN SELECT * FROM temp_consumed_lots LOOP
            INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
            VALUES (v_asset_leg_id, v_lot.lot_id, v_lot.quantity_consumed);
        END LOOP;
        v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
        RETURN v_response;
    ELSE -- Standard withdrawal logic for VND
        SELECT id INTO v_earnings_security_id FROM public.securities WHERE ticker = 'EARNINGS';
        SELECT id INTO v_capital_security_id FROM public.securities WHERE ticker = 'CAPITAL';
        IF v_earnings_security_id IS NULL OR v_capital_security_id IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' securities.');
        END IF;
        SELECT a.id, s.currency_code INTO v_earnings_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_earnings_security_id AND a.user_id = p_user_id;
        SELECT a.id, s.currency_code INTO v_capital_asset
        FROM public.assets a JOIN public.securities s ON a.security_id = s.id
        WHERE a.security_id = v_capital_security_id AND a.user_id = p_user_id;
        IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
            RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets for user.');
        END IF;
        v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
        IF v_earnings_balance < 0 THEN
            v_draw_from_earnings := LEAST(v_calculated_amount, ABS(v_earnings_balance));
        ELSE
            v_draw_from_earnings := 0;
        END IF;
        v_draw_from_capital := v_calculated_amount - v_draw_from_earnings;
        IF v_draw_from_capital > 0 THEN
            v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
            IF v_draw_from_capital > ABS(v_capital_balance) THEN
                RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.');
            END IF;
        END IF;
        INSERT INTO public.transactions (user_id, transaction_date, type, description)
        VALUES (p_user_id, p_transaction_date, 'withdraw', COALESCE(p_description, 'Owner draw'))
        RETURNING id INTO v_transaction_id;
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, p_account_id, p_asset_id, p_quantity * -1, v_calculated_amount * -1, v_cash_asset_currency_code);
        IF v_draw_from_earnings > 0 THEN
            INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
            VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
        END IF;
        IF v_draw_from_capital > 0 THEN
            INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
            VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
        END IF;
        v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
        RETURN v_response;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Find the security_id for the given ticker
  SELECT id INTO v_security_id
  FROM public.securities
  WHERE ticker = p_ticker;
  IF v_security_id IS NULL THEN
    RAISE EXCEPTION 'Security with ticker % not found', p_ticker;
  END IF;
  -- Upsert the price into the daily_stock_prices table
  INSERT INTO public.daily_stock_prices (security_id, date, price)
  VALUES (v_security_id, CURRENT_DATE, p_price)
  ON CONFLICT (security_id, date) DO UPDATE
  SET price = EXCLUDED.price;
END;
$$;
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."account_type" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "security_id" "uuid"
);
CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."currency_type" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."daily_exchange_rates" (
    "currency_code" character varying(10) NOT NULL,
    "date" "date" NOT NULL,
    "rate" numeric(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."daily_market_indices" (
    "date" "date" NOT NULL,
    "symbol" "text" NOT NULL,
    "close" numeric
);
CREATE TABLE IF NOT EXISTS "public"."daily_performance_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "total_assets_value" bigint NOT NULL,
    "total_liabilities_value" bigint NOT NULL,
    "net_equity_value" bigint NOT NULL,
    "net_cash_flow" bigint NOT NULL,
    "equity_index" numeric(8,2)
);
CREATE TABLE IF NOT EXISTS "public"."daily_stock_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lender_name" "text" NOT NULL,
    "principal_amount" numeric(16,2) NOT NULL,
    "currency_code" character varying(10) NOT NULL,
    "interest_rate" numeric(4,2) DEFAULT 0 NOT NULL,
    "start_date" "date" NOT NULL,
    "status" "public"."debt_status" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."lot_consumptions" (
    "sell_transaction_leg_id" "uuid" NOT NULL,
    "tax_lot_id" "uuid" NOT NULL,
    "quantity_consumed" numeric(14,8) NOT NULL,
    CONSTRAINT "lot_consumptions_quantity_consumed_check" CHECK ((("quantity_consumed")::numeric > (0)::numeric))
);
COMMENT ON COLUMN "public"."lot_consumptions"."tax_lot_id" IS 'The tax lot that was consumed from.';
COMMENT ON COLUMN "public"."lot_consumptions"."quantity_consumed" IS 'The number of shares consumed from this lot in a specific sale.';
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_currency" character varying(10) NOT NULL,
    "display_name" "text",
    "last_stock_fetching" timestamp with time zone
);
COMMENT ON COLUMN "public"."profiles"."display_name" IS 'The user''s preferred display name in the application.';
CREATE TABLE IF NOT EXISTS "public"."securities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_class" "public"."asset_class" NOT NULL,
    "ticker" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency_code" character varying(10),
    "logo_url" "text"
);
CREATE TABLE IF NOT EXISTS "public"."tax_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "creation_transaction_id" "uuid" NOT NULL,
    "origin" "public"."tax_lot_origin" NOT NULL,
    "creation_date" "date" NOT NULL,
    "original_quantity" numeric(14,8) NOT NULL,
    "cost_basis" numeric(16,2) DEFAULT 0 NOT NULL,
    "remaining_quantity" numeric(14,8) NOT NULL,
    CONSTRAINT "tax_lots_cost_basis_check" CHECK (("cost_basis" >= (0)::numeric)),
    CONSTRAINT "tax_lots_original_quantity_check" CHECK ((("original_quantity")::numeric > (0)::numeric)),
    CONSTRAINT "tax_lots_remaining_quantity_check" CHECK ((("remaining_quantity")::numeric >= (0)::numeric))
);
COMMENT ON COLUMN "public"."tax_lots"."origin" IS 'The type of transaction that created the lot (e.g., ''buy'', ''split''). Reuses the transaction_type enum.';
COMMENT ON COLUMN "public"."tax_lots"."remaining_quantity" IS 'The quantity of the asset remaining in this lot. Updated upon sale.';
CREATE TABLE IF NOT EXISTS "public"."transaction_details" (
    "transaction_id" "uuid" NOT NULL,
    "price" numeric(16,2) NOT NULL,
    "fees" numeric(16,2) DEFAULT 0 NOT NULL,
    "taxes" numeric(16,2) DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."transaction_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" numeric(16,2) NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "currency_code" character varying(10) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "description" "text",
    "related_debt_id" "uuid"
);
ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_user_id_security_id_key" UNIQUE ("user_id", "security_id");
ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");
ALTER TABLE ONLY "public"."daily_performance_snapshots"
    ADD CONSTRAINT "daily_performance_snapshots_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."daily_performance_snapshots"
    ADD CONSTRAINT "daily_performance_snapshots_user_id_date_key" UNIQUE ("user_id", "date");
ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency_code", "date");
ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_pkey" PRIMARY KEY ("sell_transaction_leg_id", "tax_lot_id");
ALTER TABLE ONLY "public"."daily_market_indices"
    ADD CONSTRAINT "market_data_pkey" PRIMARY KEY ("date", "symbol");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."securities"
    ADD CONSTRAINT "securities_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."securities"
    ADD CONSTRAINT "securities_ticker_key" UNIQUE ("ticker");
ALTER TABLE ONLY "public"."daily_stock_prices"
    ADD CONSTRAINT "security_daily_prices_pkey" PRIMARY KEY ("security_id", "date");
ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."transaction_details"
    ADD CONSTRAINT "transaction_details_pkey" PRIMARY KEY ("transaction_id");
ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
CREATE INDEX "accounts_user_id_fkey_idx" ON "public"."accounts" USING "btree" ("user_id");
CREATE INDEX "assets_security_id_idx" ON "public"."assets" USING "btree" ("security_id");
CREATE INDEX "debts_currency_code_idx" ON "public"."debts" USING "btree" ("currency_code");
CREATE INDEX "debts_user_id_idx" ON "public"."debts" USING "btree" ("user_id");
CREATE INDEX "lot_consumptions_tax_lot_id_idx" ON "public"."lot_consumptions" USING "btree" ("tax_lot_id");
CREATE INDEX "profiles_display_currency_idx" ON "public"."profiles" USING "btree" ("display_currency");
CREATE INDEX "securities_currency_code_idx" ON "public"."securities" USING "btree" ("currency_code");
CREATE INDEX "tax_lots_asset_id_idx" ON "public"."tax_lots" USING "btree" ("asset_id");
CREATE INDEX "tax_lots_creation_transaction_id_idx" ON "public"."tax_lots" USING "btree" ("creation_transaction_id");
CREATE INDEX "tax_lots_user_id_idx" ON "public"."tax_lots" USING "btree" ("user_id");
CREATE INDEX "transaction_legs_account_id_idx" ON "public"."transaction_legs" USING "btree" ("account_id");
CREATE INDEX "transaction_legs_asset_id_idx" ON "public"."transaction_legs" USING "btree" ("asset_id");
CREATE INDEX "transaction_legs_currency_code_idx" ON "public"."transaction_legs" USING "btree" ("currency_code");
CREATE INDEX "transaction_legs_transaction_id_idx" ON "public"."transaction_legs" USING "btree" ("transaction_id");
CREATE INDEX "transactions_related_debt_id_idx" ON "public"."transactions" USING "btree" ("related_debt_id");
CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");
ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "public"."securities"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."daily_performance_snapshots"
    ADD CONSTRAINT "daily_performance_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");
ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."daily_exchange_rates"
    ADD CONSTRAINT "exchange_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_sell_transaction_leg_id_fkey" FOREIGN KEY ("sell_transaction_leg_id") REFERENCES "public"."transaction_legs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."lot_consumptions"
    ADD CONSTRAINT "lot_consumptions_tax_lot_id_fkey" FOREIGN KEY ("tax_lot_id") REFERENCES "public"."tax_lots"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_display_currency_fkey" FOREIGN KEY ("display_currency") REFERENCES "public"."currencies"("code");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."securities"
    ADD CONSTRAINT "securities_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");
ALTER TABLE ONLY "public"."daily_stock_prices"
    ADD CONSTRAINT "security_daily_prices_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "public"."securities"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_creation_transaction_id_fkey" FOREIGN KEY ("creation_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tax_lots"
    ADD CONSTRAINT "tax_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."transaction_details"
    ADD CONSTRAINT "transaction_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");
ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");
ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");
ALTER TABLE ONLY "public"."transaction_legs"
    ADD CONSTRAINT "transaction_legs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_related_debt_id_fkey" FOREIGN KEY ("related_debt_id") REFERENCES "public"."debts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
RESET ALL;
