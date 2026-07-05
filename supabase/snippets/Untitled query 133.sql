with
  user_legs as (
    select
      tl.tx_id,
      tl.asset_id,
      tl.quantity,
      tl.debit,
      tl.credit
    from
      tx_legs tl
      join tx_entries e on e.id = tl.tx_id
    where
      e.user_id = auth.uid ()
  ),
  debt_interest as (
    select
      sum(accrued_interest)
    from
      outstanding_debts
  )
select
  a.ticker,
  a.name,
  a.asset_class,
  a.logo_url,
  a.currency_code,
  coalesce(sum(ul.quantity), 0) as quantity,
  coalesce(sum(ul.debit) - sum(ul.credit), 0) as cost_basis,
  case
    when a.asset_class = any (array['stock'::asset_class, 'fund'::asset_class]) then round(sum(ul.quantity * COALESCE(sp.price, er.rate)), 0)
    when a.ticker = 'INTERESTS' then (
      select
        sum(accrued_interest)
      from
        outstanding_debts
    )
    else sum(ul.quantity)
  end as total_value,
  COALESCE(COALESCE(sp.price, er.rate), 0::numeric) as mkt_price,
  coalesce(
    case
      when a.ticker = 'INTERESTS' then - (
        select
          sum(accrued_interest)
        from
          outstanding_debts
      )
      else round(
        sum(ul.quantity * COALESCE(sp.price, er.rate)) - (sum(ul.debit) - sum(ul.credit)),
        0
      )
    end,
    0
  ) as net_profit
from
  assets a
  left join user_legs ul on a.id = ul.asset_id
  left join lateral (
    select
      hp.close * 1000::numeric as price
    from
      historical_prices hp
    where
      hp.asset_id = a.id
    order by
      hp.date desc
    limit
      1
  ) sp on true
  left join lateral (
    select
      hfx.rate
    from
      historical_fxrate hfx
    where
      hfx.currency_code = a.currency_code
    order by
      hfx.date desc
    limit
      1
  ) er on true
group by
  a.ticker,
  a.name,
  a.logo_url,
  a.currency_code,
  a.asset_class,
  sp.price,
  er.rate
having
  abs(sum(ul.quantity)) > 0::numeric
  or a.ticker = 'INTERESTS'
order by
  a.asset_class;