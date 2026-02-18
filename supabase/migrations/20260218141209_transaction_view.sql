create view public.tx_summary with (security_invoker = on) as
select
  t.id,
  t.created_at,
  t.category,
  case
    when t.category = 'stock' then s.side
    when t.category = 'cashflow' then cf.operation
    else d.operation
  end as operation,
  case
    when t.category = 'stock' then s.net_proceed
    when t.category = 'cashflow' then cf.net_proceed
    else d.net_proceed
  end as value,
  t.memo
from tx_entries t
  left join tx_stock s on t.id = s.tx_id
  left join tx_cashflow cf on t.id = cf.tx_id
  left join tx_debt d on t.id = d.tx_id;