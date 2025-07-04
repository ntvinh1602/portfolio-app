-- First, drop the old function if it exists
DROP FUNCTION IF EXISTS "public"."get_asset_summary"();

-- Then, create the new and improved function
CREATE OR REPLACE FUNCTION "public"."get_asset_summary"() RETURNS json
    LANGUAGE "plpgsql"
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
    SELECT a.asset_class, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    WHERE a.user_id = auth.uid()
      AND a.asset_class NOT IN ('equity', 'liability')
    GROUP BY a.asset_class
  ) as class_totals;

  -- Calculate market value totals by asset class
  SELECT COALESCE(jsonb_object_agg(market_totals.asset_class, market_totals.market_value), '{}'::jsonb)
  INTO asset_market_totals_by_class
  FROM (
      SELECT
        a.asset_class,
        SUM(COALESCE(qty.total_quantity, 0) * COALESCE(a.last_updated_price, 0)) AS market_value
      FROM
        assets a
      LEFT JOIN
        (SELECT asset_id, SUM(quantity) AS total_quantity
         FROM transaction_legs
         JOIN transactions t ON transaction_legs.transaction_id = t.id
         WHERE t.user_id = auth.uid()
         GROUP BY asset_id) AS qty ON a.id = qty.asset_id
      WHERE a.user_id = auth.uid() AND a.asset_class NOT IN ('equity', 'liability')
      GROUP BY a.asset_class
  ) as market_totals;

  -- Calculate totals by ticker for equity/liability accounts
  SELECT COALESCE(jsonb_object_agg(ticker_totals.ticker, ticker_totals.total), '{}'::jsonb)
  INTO asset_totals_by_ticker
  FROM (
    SELECT a.ticker, sum(tl.amount) as total
    FROM transaction_legs tl
    JOIN assets a ON tl.asset_id = a.id
    WHERE a.user_id = auth.uid()
    GROUP BY a.ticker
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

ALTER FUNCTION "public"."get_asset_summary"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_summary"() TO "service_role";