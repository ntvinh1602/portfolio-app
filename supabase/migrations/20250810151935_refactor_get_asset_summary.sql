CREATE OR REPLACE FUNCTION "public"."get_asset_summary"("p_user_id" "uuid")
  RETURNS json
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
    SELECT s.asset_class, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as cb_totals;

  -- Calculate market value totals by asset class (excluding equity/liability)
  SELECT COALESCE(jsonb_object_agg(mv_totals.asset_class, mv_totals.total), '{}'::jsonb)
  INTO asset_mv_by_class
  FROM (
    SELECT
      s.asset_class,
      SUM(
        CASE
          WHEN s.asset_class = 'stock' THEN a.current_quantity * COALESCE(public.get_latest_stock_price(s.id), 0)
          WHEN s.asset_class = 'crypto' THEN a.current_quantity * COALESCE(public.get_latest_crypto_price(s.id), 0) * COALESCE(public.get_latest_exchange_rate('USD'), 1)
          ELSE a.current_quantity * COALESCE(public.get_latest_exchange_rate(s.currency_code), 1)
        END
      ) AS total
    FROM assets a
    JOIN securities s ON a.security_id = s.id
    WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability')
    GROUP BY s.asset_class
  ) as mv_totals;

  -- Calculate total asset cost basis
  total_assets_cb := (coalesce((asset_cb_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_cb_by_class->>'crypto')::numeric, 0));

  -- Calculate total asset market value
  total_assets_mv := (coalesce((asset_mv_by_class->>'cash')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'stock')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'epf')::numeric, 0)) +
    (coalesce((asset_mv_by_class->>'crypto')::numeric, 0));

  -- Calculate liability values
  SELECT a.current_quantity * -1 INTO debts_principal
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'DEBTS' AND a.user_id = p_user_id;

  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM debts d
  WHERE d.user_id = p_user_id AND d.status = 'active';
  liability_total := debts_principal + accrued_interest;

  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL' AND a.user_id = p_user_id;
  unrealized_pl := total_assets_mv - total_assets_cb - accrued_interest;
  equity_total := owner_capital + unrealized_pl;
  
  -- Build the result JSON
  SELECT json_build_object(
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_mv_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_mv_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_mv_by_class->>'epf')::numeric, 0)),
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