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
        a.current_quantity * COALESCE(sp.price, 1) * COALESCE(er.rate, 1)
      ) AS total
    FROM public.assets a
    LEFT JOIN LATERAL (
      SELECT price
      FROM public.daily_security_prices
      WHERE asset_id = a.id
      ORDER BY date DESC
      LIMIT 1
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT rate
      FROM public.daily_exchange_rates
      WHERE currency_code = a.currency_code
      ORDER BY date DESC
      LIMIT 1
    ) er ON TRUE
    WHERE a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) mv_totals;

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
  SELECT COALESCE(SUM(
    d.principal_amount * (
      POWER(1 + (d.interest_rate / 100 / 365),
        (CURRENT_DATE - tb.transaction_date)
      ) - 1
    )
  ), 0)
  INTO accrued_interest
  FROM public.debts d
  JOIN public.transactions tb ON tb.id = d.borrow_txn_id
  LEFT JOIN public.transactions tr ON tr.id = d.repay_txn_id
  WHERE tr.id IS NULL OR tr.transaction_date > CURRENT_DATE;
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