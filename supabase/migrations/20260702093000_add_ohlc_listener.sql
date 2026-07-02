create table if not exists public.ohlc_bars (
  symbol text not null,
  resolution text not null,
  bar_time timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null,
  type text,
  last_updated timestamptz,
  received_at timestamptz not null default now(),
  primary key (symbol, resolution, bar_time)
);

alter table public.ohlc_bars enable row level security;

revoke all on table public.ohlc_bars from anon;
revoke all on table public.ohlc_bars from authenticated;
grant select, insert, update on table public.ohlc_bars to service_role;

create or replace function public.active_stock_tickers()
returns table (ticker text)
language sql
stable
security invoker
as $$
  select a.ticker
  from public.tx_legs l
  join public.assets a on a.id = l.asset_id
  where a.asset_class = 'stock'
  group by a.ticker
  having sum(l.quantity) > 0
$$;

revoke all on function public.active_stock_tickers() from public;
revoke all on function public.active_stock_tickers() from anon;
revoke all on function public.active_stock_tickers() from authenticated;
grant execute on function public.active_stock_tickers() to service_role;
