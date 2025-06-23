create or replace function get_asset_summary()
returns json
language plpgsql
as $$
declare
  result json;
  display_currency text;
  asset_totals_by_class jsonb;
  asset_totals_by_ticker jsonb;
  cash_total numeric;
  loans_payable numeric;
  margins_payable numeric;
  liability_total numeric;
  capital_total numeric;
  earnings_total numeric;
  equity_total numeric;
  assets_total numeric;
begin
  -- Get display currency from the authenticated user's profile
  select p.display_currency into display_currency from profiles p where p.id = auth.uid();
  if display_currency is null then
    display_currency := 'USD';
  end if;

  -- Calculate totals by asset class, filtered by the user's assets
  select jsonb_object_agg(asset_class, total)
  into asset_totals_by_class
  from (
    select a.asset_class, sum(tl.amount) as total
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where a.user_id = auth.uid() -- Ensure we only get assets for the current user
    group by a.asset_class
  ) as class_totals;

  -- Calculate totals by ticker, filtered by the user's assets
  select jsonb_object_agg(ticker, total)
  into asset_totals_by_ticker
  from (
    select a.ticker, sum(tl.amount) as total
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where a.user_id = auth.uid() -- Ensure we only get assets for the current user
    group by a.ticker
  ) as ticker_totals;

  -- Set defaults to 0 if null
  asset_totals_by_class := coalesce(asset_totals_by_class, '{}'::jsonb);
  asset_totals_by_ticker := coalesce(asset_totals_by_ticker, '{}'::jsonb);

  -- Calculate asset values
  assets_total := (coalesce((asset_totals_by_class->>'cash')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'stock')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'epf')::numeric, 0)) +
                  (coalesce((asset_totals_by_class->>'crypto')::numeric, 0));

  -- Calculate liability values
  cash_total := coalesce((asset_totals_by_class->>'cash')::numeric, 0);
  loans_payable := (coalesce((asset_totals_by_ticker->>'LOANS_PAYABLE')::numeric, 0)) * -1;
  margins_payable := case when cash_total < 0 then abs(cash_total) else 0 end;
  liability_total := loans_payable + margins_payable;

  -- Calculate equity values
  capital_total := (coalesce((asset_totals_by_ticker->>'CAPITAL')::numeric, 0)) * -1;
  earnings_total := (coalesce((asset_totals_by_ticker->>'EARNINGS')::numeric, 0)) * -1;
  equity_total := capital_total + earnings_total;

  -- Build the result JSON
  select json_build_object(
    'displayCurrency', display_currency,
    'assets', json_build_array(
      json_build_object('type', 'Cash', 'totalAmount', coalesce((asset_totals_by_class->>'cash')::numeric, 0)),
      json_build_object('type', 'Stocks', 'totalAmount', coalesce((asset_totals_by_class->>'stock')::numeric, 0)),
      json_build_object('type', 'EPF', 'totalAmount', coalesce((asset_totals_by_class->>'epf')::numeric, 0)),
      json_build_object('type', 'Crypto', 'totalAmount', coalesce((asset_totals_by_class->>'crypto')::numeric, 0))
    ),
    'totalAssets', assets_total,
    'liabilities', json_build_array(
      json_build_object('type', 'Loans Payable', 'totalAmount', loans_payable),
      json_build_object('type', 'Margins Payable', 'totalAmount', margins_payable)
    ),
    'totalLiabilities', liability_total,
    'equity', json_build_array(
      json_build_object('type', 'Paid-in Capital', 'totalAmount', capital_total),
      json_build_object('type', 'Retained Earnings', 'totalAmount', earnings_total)
    ),
    'totalEquity', equity_total
  ) into result;

  return result;
end;
$$;