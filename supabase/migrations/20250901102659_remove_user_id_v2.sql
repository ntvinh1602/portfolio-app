drop function if exists public.get_active_debts(uuid);

drop policy if exists "Users can access their debts" on public.debts;

create policy "Logged in users can access debts"
on "public"."debts"
to authenticated
using (true);

alter table public.debts
drop column user_id;

CREATE OR REPLACE FUNCTION "public"."get_active_debts"() RETURNS SETOF "public"."debts"
  LANGUAGE "sql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
SELECT * FROM public.debts WHERE is_active;
$$;

drop function if exists public.get_asset_balance(uuid, uuid);

CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid") RETURNS numeric
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.transaction_legs
  WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM public.transactions);
  RETURN v_balance;
END;
$$;

drop function if exists public.get_asset_currency(uuid, uuid);

CREATE OR REPLACE FUNCTION "public"."get_asset_currency"("p_asset_id" "uuid") RETURNS "text"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_currency text;
BEGIN
  SELECT s.currency_code INTO v_currency
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE a.id = p_asset_id;
  RETURN v_currency;
END;
$$;

drop function if exists public.get_asset_data(uuid);

CREATE OR REPLACE FUNCTION "public"."get_asset_data"() RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  assets_data jsonb;
BEGIN
  -- Fetch assets data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'security_id', a.security_id,
      'securities', to_jsonb(s)
    )
  ) INTO assets_data
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  WHERE s.asset_class NOT IN ('equity', 'liability');
  RETURN jsonb_build_object('assets', assets_data);
END;
$$;

drop function if exists public.get_asset_id_from_ticker(uuid, text);

CREATE OR REPLACE FUNCTION "public"."get_asset_id_from_ticker"("p_ticker" "text") RETURNS "uuid"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT a.id INTO v_id
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = p_ticker;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Asset for ticker % not found for user.', p_ticker;
  END IF;
  RETURN v_id;
END;
$$;

drop function if exists public.get_asset_summary(uuid);

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
    SELECT s.asset_class, sum(tl.amount) as total
    FROM public.transaction_legs tl
    JOIN public.assets a ON tl.asset_id = a.id
    JOIN public.securities s ON a.security_id = s.id
    WHERE s.asset_class NOT IN ('equity', 'liability')
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
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE s.asset_class NOT IN ('equity', 'liability')
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
  WHERE s.ticker = 'DEBTS';
  -- Calculate accrued interest using daily compounding
  SELECT COALESCE(SUM(d.principal_amount * (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)), 0)
  INTO accrued_interest
  FROM public.debts d
  WHERE d.is_active;
  liability_total := debts_principal + accrued_interest;
  -- Calculate equity values
  SELECT a.current_quantity * -1 INTO owner_capital
  FROM public.assets a
  JOIN public.securities s ON s.id = a.security_id
  WHERE s.ticker = 'CAPITAL';
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