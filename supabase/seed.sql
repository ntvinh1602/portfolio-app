-- Currency
insert into currencies (code, name)
values
  ('VND', 'Vietnamese Dong'),
  ('MYR', 'Malaysian Riggit');

-- Conceptual balance sheet assets
insert into assets (asset_class, ticker, name, currency_code)
values
  ('liability', 'MARGIN', 'Margin', 'VND'),
  ('liability', 'INTERESTS', 'Accrued Interest', 'VND'),
  ('liability', 'DEBTS', 'Long-term Debt', 'VND'),
  ('equity', 'CAPITAL', 'Owner Capital', 'VND'),
  ('equity', 'UNREALIZED', 'Unrealized PnL', 'VND'),
  ('cash', 'FX.VND', 'Vietnamese Dong', 'VND');

-- Stock and fund assets
insert into assets (asset_class, ticker, name, currency_code, logo_url)
values
  ('index', 'VNINDEX', 'VN-Index', 'VND', null),
  ('fund', 'EPF', 'Employees Provident Fund', 'MYR', null),
  ('stock', 'HPG', 'Hoa Phat Group', 'VND', 'https://s3-symbol-logo.tradingview.com/hoa-phat-group--big.svg'),
  ('stock', 'MWG', 'Mobile World Investment', 'VND', 'https://s3-symbol-logo.tradingview.com/mobile-world-investment-corporation--big.svg'),
  ('stock', 'MBB', 'MBBank', 'VND', 'https://s3-symbol-logo.tradingview.com/military-commercial-joint-stock-bank--big.svg');

-- Historical stock prices
with dates as (
  select d::date as date
  from generate_series(
    current_date - interval '3 years',
    current_date,
    interval '1 day'
  ) d
  where extract(isodow from d) <= 5
),
asset_base as (
  select
    id as asset_id,
    ticker,
    case
      when ticker = 'HPG' then 25000
      when ticker = 'MWG' then 60000
      when ticker = 'MBB' then 20000
      else 100
    end::numeric as base_price
  from assets
  where ticker in ('HPG', 'MWG', 'MBB')
),
returns as (
  select
    d.date,
    a.asset_id,
    a.base_price,
    greatest(least(exp((random() - 0.5) / 20), 1.07), 0.93) as daily_return
  from dates d
  cross join asset_base a
),
prices as (
  select
    asset_id,
    date,
    base_price * exp(sum(ln(daily_return)) over (partition by asset_id order by date)) as price
  from returns
)
insert into daily_security_prices (asset_id, date, price)
select asset_id, date, price
from prices;

-- Historical VN-Index
with dates as (
  select d::date as date
  from generate_series(
    current_date - interval '3 years',
    current_date,
    interval '1 day'
  ) d
  where extract(isodow from d) <= 5
),
returns as (
  select
    date,
    greatest(least(1 + (random() - 0.5) * 0.14, 1.07), 0.93) as daily_return
  from dates
),
prices as (
  select
    date,
    1200 * exp(sum(ln(daily_return)) over (order by date)) as close
  from returns
)
insert into daily_market_indices (date, symbol, close)
select
  date,
  'VNINDEX',
  close
from prices;

-- Historical currency exchange rate
with dates as (
  select d::date as date
  from generate_series(
    current_date - interval '3 years',
    current_date,
    interval '1 day'
  ) d
  where extract(isodow from d) <= 5
),
returns as (
  select
    date,
    greatest(least(1 + (random() - 0.5) * 0.01, 1.005), 0.995) as daily_return
  from dates
),
rates as (
  select
    date,
    6000 * exp(sum(ln(daily_return)) over (order by date)) as rate
  from returns
)
insert into daily_exchange_rates (currency_code, date, rate)
select
  'MYR',
  date,
  rate
from rates;


-- Sample transaction events
insert into tx_entries (id, created_at, category, memo)
values
  (
    '00000000-0000-0000-0000-000000000001', -- Initial deposit
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '500 days'
    )::timestamptz,
    'cashflow',
    'Initial deposit'
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- Borrow
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '490 days'
    )::timestamptz,
    'debt',
    'Borrow 100000000 from A at 6%'
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- Borrow
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '480 days'
    )::timestamptz,
    'debt',
    'Borrow 100000000 from B at 7%'
  ),
  (
    '00000000-0000-0000-0000-000000000004', -- Buy
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '470 days'
    )::timestamptz,
    'stock',
    'Buy 20000 HPG at 24000'
  ),
  (
    '00000000-0000-0000-0000-000000000005', -- Repay
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '400 days'
    )::timestamptz,
    'debt',
    'Repay B'
  ),
  (
    '00000000-0000-0000-0000-000000000006', -- Buy
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '350 days'
    )::timestamptz,
    'stock',
    'Buy 5000 MWG at 60000'
  ),
  (
    '00000000-0000-0000-0000-000000000007', -- Buy
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '340 days'
    )::timestamptz,
    'stock',
    'Buy 10000 MBB at 20000'
  ),
  (
    '00000000-0000-0000-0000-000000000008', -- Deposit
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '300 days'
    )::timestamptz,
    'cashflow',
    'EPF contribution'
  ),
  (
    '00000000-0000-0000-0000-000000000009', -- Withdraw
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '100 days'
    )::timestamptz,
    'cashflow',
    'VND withdrawal'
  ),
  (
    '00000000-0000-0000-0000-000000000010', -- Sell
    (
      select max(date)
      from daily_security_prices
      where date <= now() - interval '50 days'
    )::timestamptz,
    'stock',
    'Sell 5000 MBB at 25000'
  );

-- Debt events
insert into tx_debt (tx_id, operation, principal, interest, lender, rate, repay_tx)
values 
  (
    '00000000-0000-0000-0000-000000000002',
    'borrow',
    100000000,
    0,
    'A',
    6,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'borrow',
    100000000,
    0,
    'B',
    7,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'repay',
    100000000,
    1520000,
    null,
    null,
    '00000000-0000-0000-0000-000000000003'
  );

-- Cashflow events
insert into tx_cashflow (tx_id, asset_id, operation, quantity, fx_rate)
select
  '00000000-0000-0000-0000-000000000001',
  id,
  'deposit',
  1500000000,
  1
from assets
where ticker = 'FX.VND';
insert into tx_cashflow (tx_id, asset_id, operation, quantity, fx_rate)
select
  '00000000-0000-0000-0000-000000000008',
  id,
  'deposit',
  3000,
  6200
from assets
where ticker = 'EPF';
insert into tx_cashflow (tx_id, asset_id, operation, quantity, fx_rate)
select
  '00000000-0000-0000-0000-000000000009',
  id,
  'withdraw',
  50000000,
  1
from assets
where ticker = 'FX.VND';

-- Stock trades
insert into tx_stock (tx_id, stock_id, side, price, quantity, fee, tax)
select
  '00000000-0000-0000-0000-000000000004',
  id,
  'buy',
  24000,
  20000,
  144000,
  0
from assets
where ticker = 'HPG';
insert into tx_stock (tx_id, stock_id, side, price, quantity, fee, tax)
select
  '00000000-0000-0000-0000-000000000006',
  id,
  'buy',
  60000,
  5000,
  90000,
  0
from assets
where ticker = 'MWG';
insert into tx_stock (tx_id, stock_id, side, price, quantity, fee, tax)
select
  '00000000-0000-0000-0000-000000000007',
  id,
  'buy',
  20000,
  10000,
  60000,
  0
from assets
where ticker = 'MBB';
insert into tx_stock (tx_id, stock_id, side, price, quantity, fee, tax)
select
  '00000000-0000-0000-0000-000000000010',
  id,
  'sell',
  25000,
  5000,
  37500,
  125000
from assets
where ticker = 'MBB';