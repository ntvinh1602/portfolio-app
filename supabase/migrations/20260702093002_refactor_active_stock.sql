drop function if exists public.active_stock_tickers();
create or replace function public.active_stock_tickers()
returns jsonb
language sql
stable
security invoker
as $$
  select coalesce(
    jsonb_agg(ticker order by ticker),
    '[]'::jsonb
  )
  from (
    select a.ticker
    from public.tx_legs l
    join public.assets a on a.id = l.asset_id
    where a.asset_class = 'stock'
    group by a.ticker
    having sum(l.quantity) > 0
  ) t(ticker);
$$;

grant all on function public.active_stock_tickers() to public;
grant all on function public.active_stock_tickers() to anon;
grant all on function public.active_stock_tickers() to authenticated;
