CREATE OR REPLACE FUNCTION public.get_performance_benchmark_data(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(date text, portfolio_value numeric, spy_value numeric, vnindex_value numeric)
LANGUAGE plpgsql
AS $$
DECLARE
    v_first_portfolio_value numeric;
    v_first_spy_value numeric;
    v_first_vnindex_value numeric;
BEGIN
    -- Step 1: Find the first available values on or after the start date for normalization
    SELECT dps.equity_index INTO v_first_portfolio_value
    FROM daily_performance_snapshots dps
    WHERE dps.user_id = p_user_id AND dps.date >= p_start_date
    ORDER BY dps.date
    LIMIT 1;

    SELECT md.close INTO v_first_spy_value
    FROM market_data md
    WHERE md.symbol = 'SPY' AND md.date >= p_start_date
    ORDER BY md.date
    LIMIT 1;

    SELECT md.close INTO v_first_vnindex_value
    FROM market_data md
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
    spy_data AS (
        SELECT
            md.date,
            md.close
        FROM market_data md
        WHERE md.symbol = 'SPY' AND md.date BETWEEN p_start_date AND p_end_date
    ),
    vnindex_data AS (
        SELECT
            md.date,
            md.close
        FROM market_data md
        WHERE md.symbol = '^VNINDEX' AND md.date BETWEEN p_start_date AND p_end_date
    )
    SELECT
        to_char(ds.day, 'YYYY-MM-DD') as date,
        -- Normalize portfolio value
        (pd.equity_index / v_first_portfolio_value) * 100 as portfolio_value,
        -- Normalize SPY value
        (spy.close / v_first_spy_value) * 100 as spy_value,
        -- Normalize VNINDEX value
        (vni.close / v_first_vnindex_value) * 100 as vnindex_value
    FROM date_series ds
    LEFT JOIN portfolio_data pd ON ds.day = pd.date
    LEFT JOIN spy_data spy ON ds.day = spy.date
    LEFT JOIN vnindex_data vni ON ds.day = vni.date
    WHERE pd.equity_index IS NOT NULL OR spy.close IS NOT NULL OR vni.close IS NOT NULL -- Only return days with any data
    ORDER BY ds.day;

END;
$$;