drop function if exists public.get_benchmark_chart_data(uuid, integer);

CREATE OR REPLACE FUNCTION "public"."get_benchmark_chart_data"("p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "portfolio_value" numeric, "vni_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT
      label,
      s.date::date AS snapshot_date,
      s.portfolio_value,
      s.vni_value
    FROM public.sampling_benchmark_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;

drop function if exists public.get_crypto_holdings(uuid);

CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT
      s.id AS security_id,
      public.get_latest_crypto_price(s.id) AS latest_price,
      public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM public.securities s
    WHERE s.asset_class = 'crypto'
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url AS logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.latest_price,
    ld.latest_usd_rate,
    SUM(tl.quantity) * ld.latest_price * ld.latest_usd_rate AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.security_id = s.id
  WHERE s.asset_class = 'crypto'
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, ld.latest_price, ld.latest_usd_rate
  HAVING SUM(tl.quantity) > 0;
END;
$$;

drop function if exists public.get_equity_chart_data(uuid, integer);

CREATE OR REPLACE FUNCTION "public"."get_equity_chart_data"("p_threshold" integer) RETURNS TABLE("range_label" "text", "snapshot_date" "date", "net_equity_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', '1y', '6m', '3m'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN '1y' THEN start_date := end_date - INTERVAL '1 year';
      WHEN '6m' THEN start_date := end_date - INTERVAL '6 months';
      WHEN '3m' THEN start_date := end_date - INTERVAL '3 months';
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT
      label,
      s.date AS snapshot_date,
      s.net_equity_value
    FROM public.sampling_equity_data(start_date, end_date, p_threshold) s;
  END LOOP;
END;
$$;

drop function if exists public.get_monthly_expenses(uuid, date, date);

CREATE OR REPLACE FUNCTION "public"."get_monthly_expenses"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "trading_fees" numeric, "taxes" numeric, "interest" numeric)
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
    FROM public.transactions t
    JOIN public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN public.assets a ON tl.asset_id = a.id
    JOIN public.securities s ON a.security_id = s.id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
      AND t.type = 'expense'
      AND s.ticker IN ('EARNINGS', 'CAPITAL')
    GROUP BY 1
  ),
  -- 2. Loan Interest from debt_payment transactions
  loan_interest_costs AS (
    SELECT
      date_trunc('month', t.transaction_date)::date AS month,
      COALESCE(SUM(tl.amount), 0) AS total_interest
    FROM public.transactions t
    JOIN public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN public.assets a ON tl.asset_id = a.id
    JOIN public.securities s ON a.security_id = s.id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
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
    FROM public.transactions t
    JOIN public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN public.assets a ON tl.asset_id = a.id
    JOIN public.securities s ON a.security_id = s.id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
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

drop function if exists public.get_monthly_pnl(uuid, date, date);

CREATE OR REPLACE FUNCTION "public"."get_monthly_pnl"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "pnl" numeric)
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
    SELECT public.calculate_pnl(v_month_start, v_month_end) INTO v_pnl;
    -- Return the result for the month
    month := to_char(v_month_start, 'YYYY-MM');
    pnl := v_pnl;
    RETURN NEXT;
  END LOOP;
END;
$$;

drop function if exists public.get_monthly_twr(uuid, date, date);

CREATE OR REPLACE FUNCTION "public"."get_monthly_twr"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("month" "text", "twr" numeric)
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
    SELECT public.calculate_twr(v_month_start, v_month_end) INTO v_twr;
    -- Return the result for the month
    month := to_char(v_month_start, 'YYYY-MM');
    twr := v_twr;
    RETURN NEXT;
  END LOOP;
END;
$$;

drop function if exists public.get_pnl(uuid);

CREATE OR REPLACE FUNCTION "public"."get_pnl"() RETURNS TABLE("range_label" "text", "pnl" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', 'ytd', 'mtd'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- Determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN 'ytd' THEN start_date := date_trunc('year', end_date);
      WHEN 'mtd' THEN start_date := date_trunc('month', end_date);
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT label, public.calculate_pnl(start_date, end_date);
  END LOOP;
END;
$$;

drop function if exists public.get_stock_holdings(uuid);

CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_prices AS (
    SELECT 
      s.id AS security_id, 
      public.get_latest_stock_price(s.id) AS latest_price
    FROM public.securities s
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    lp.latest_price,
    SUM(tl.quantity) * lp.latest_price AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_prices lp ON lp.security_id = s.id
  WHERE s.asset_class = 'stock'
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, lp.latest_price
  HAVING SUM(tl.quantity) > 0;
END;
$$;

drop function if exists public.get_transaction_feed(uuid, integer, integer, date, date, text);

CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" "uuid", "transaction_date" "date", "type" "text", "description" "text", "ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "amount" numeric, "currency_code" "text")
  LANGUAGE "plpgsql" SECURITY DEFINER
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
      WHEN s.logo_url IS NOT NULL THEN s.logo_url
      ELSE NULL
    END,
    tl.quantity,
    tl.amount,
    tl.currency_code::text
  FROM public.transactions t
  JOIN public.transaction_legs tl ON t.id = tl.transaction_id
  JOIN public.assets a ON tl.asset_id = a.id
  JOIN public.securities s ON a.security_id = s.id
  WHERE s.asset_class NOT IN ('equity', 'liability')
    AND NOT (s.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell'))
    AND (start_date IS NULL OR t.transaction_date >= start_date)
    AND (end_date IS NULL OR t.transaction_date <= end_date)
    AND (asset_class_filter IS NULL OR s.asset_class::text = asset_class_filter)
  ORDER BY t.created_at DESC
  LIMIT page_size
  OFFSET v_offset;
END;
$$;

drop function if exists public.get_twr(uuid);

CREATE OR REPLACE FUNCTION "public"."get_twr"() RETURNS TABLE("range_label" "text", "twr" numeric)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  ranges CONSTANT text[] := ARRAY['all_time', 'ytd'];
  start_date date;
  end_date date := CURRENT_DATE;
  label text;
BEGIN
  FOREACH label IN ARRAY ranges LOOP
    -- Determine range start
    CASE label
      WHEN 'all_time' THEN
        SELECT MIN(date) INTO start_date
        FROM public.daily_performance_snapshots;
      WHEN 'ytd' THEN start_date := date_trunc('year', end_date);
    END CASE;

    -- Call the single-range function and attach the label
    RETURN QUERY
    SELECT label, public.calculate_twr(start_date, end_date);
  END LOOP;
END;
$$;

drop function if exists public.sampling_benchmark_data(uuid, date, date, integer);

CREATE OR REPLACE FUNCTION "public"."sampling_benchmark_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "portfolio_value" numeric, "vni_value" numeric)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_first_portfolio_value numeric;
  v_first_vni_value numeric;
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
  -- Step 1: Find the first available values on or after the start date for normalization
  SELECT dps.equity_index INTO v_first_portfolio_value
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date
  ORDER BY dps.date
  LIMIT 1;
  SELECT md.close INTO v_first_vni_value
  FROM public.daily_market_indices md
  WHERE md.symbol = '^VNINDEX' AND md.date >= p_start_date
  ORDER BY md.date
  LIMIT 1;
  -- Create a temporary table to hold the raw, joined, and normalized data
  CREATE TEMP TABLE raw_data AS
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as day
  ),
  portfolio_data AS (
    SELECT
      dps.date,
      dps.equity_index
    FROM public.daily_performance_snapshots dps
    WHERE dps.date BETWEEN p_start_date AND p_end_date
  ),
  vni_data AS (
    SELECT
      md.date,
      md.close
    FROM public.daily_market_indices md
    WHERE md.symbol = '^VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    ds.day as date,
    (pd.equity_index / NULLIF(v_first_portfolio_value, 0)) * 100 as portfolio_value,
    (vni.close / NULLIF(v_first_vni_value, 0)) * 100 as vni_value,
    ROW_NUMBER() OVER (ORDER BY ds.day) as rn
  FROM date_series ds
  LEFT JOIN portfolio_data pd ON ds.day = pd.date
  LEFT JOIN vni_data vni ON ds.day = vni.date
  WHERE pd.equity_index IS NOT NULL OR vni.close IS NOT NULL
  ORDER BY ds.day;
  SELECT COUNT(*) INTO data_count FROM raw_data;
  -- If the data count is below the threshold, return all points
  IF data_count <= p_threshold THEN
    RETURN QUERY SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd;
    DROP TABLE raw_data;
    RETURN;
  END IF;
  -- LTTB Downsampling
  CREATE TEMP TABLE result_data_temp (
    date DATE,
    portfolio_value NUMERIC,
    vni_value NUMERIC
  );
  -- Always add the first point
  INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = 1;
  every := (data_count - 2.0) / (p_threshold - 2.0);
  FOR i IN 0..p_threshold - 3 LOOP
    -- Calculate average for the next bucket
    range_start := floor(a * every) + 2;
    range_end := floor((a + 1) * every) + 1;
    -- Ensure range_end does not exceed data_count
    IF range_end > data_count THEN range_end := data_count;
    END IF;
    
    -- Ensure range_start is not greater than range_end
    IF range_start > range_end THEN CONTINUE;
    END IF;
    SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;
    SELECT AVG(rd.portfolio_value) INTO avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;
    -- Find the point with the largest triangle area based on portfolio_value
    max_area := -1;
    -- Get the last point added to the results
    SELECT * INTO result_data
    FROM result_data_temp
    ORDER BY date
    DESC LIMIT 1;
    FOR data IN SELECT * FROM raw_data WHERE rn >= range_start AND rn <= range_end LOOP
      point_area := abs(
        (EXTRACT(EPOCH FROM result_data.date) - avg_x) * (data.portfolio_value - result_data.portfolio_value) -
        (EXTRACT(EPOCH FROM result_data.date) - EXTRACT(EPOCH FROM data.date)) * (avg_y - result_data.portfolio_value)
      ) * 0.5;
      IF point_area > max_area THEN
        max_area := point_area;
        point_to_add := data;
      END IF;
    END LOOP;
    -- Add the selected point to the results
    INSERT INTO result_data_temp (date, portfolio_value, vni_value)
    VALUES (point_to_add.date, point_to_add.portfolio_value, point_to_add.vni_value);
    a := a + 1;
  END LOOP;
  -- Always add the last point
  INSERT INTO result_data_temp SELECT rd.date, rd.portfolio_value, rd.vni_value FROM raw_data rd WHERE rn = data_count;
  RETURN QUERY SELECT r.date, r.portfolio_value, r.vni_value FROM result_data_temp r ORDER BY r.date;
  DROP TABLE raw_data;
  DROP TABLE result_data_temp;
END;
$$;

drop function if exists public.sampling_equity_data(uuid, date, date, integer);

CREATE OR REPLACE FUNCTION "public"."sampling_equity_data"("p_start_date" "date", "p_end_date" "date", "p_threshold" integer) RETURNS TABLE("date" "date", "net_equity_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
  FROM public.daily_performance_snapshots dps
  WHERE dps.date >= p_start_date AND dps.date <= p_end_date
  ORDER BY dps.date;
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
    SELECT AVG(EXTRACT(EPOCH FROM rd.date)) INTO avg_x
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;
    SELECT AVG(rd.net_equity_value) INTO avg_y
    FROM raw_data rd
    WHERE rn >= range_start AND rn <= range_end;
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