create or replace view public.monthly_snapshots WITH (security_invoker='on') as
with
  month_ranges as (
    select
      date_trunc('month'::text, dd.dd)::date as month_start,
      LEAST(
        (
          date_trunc('month'::text, dd.dd) + '1 mon -1 days'::interval
        )::date,
        CURRENT_DATE
      ) as month_end
    from
      generate_series(
        '2021-11-01'::date::timestamp with time zone,
        CURRENT_DATE::timestamp with time zone,
        '1 mon'::interval
      ) dd (dd)
  ),
  monthly_transactions as (
    select
      date_trunc(
        'month'::text,
        t.transaction_date::timestamp with time zone
      )::date as month,
      sum(tl.amount) filter (
        where
          t.description ~~* '%fee%'::text
      ) as total_fees,
      sum(tl.amount) filter (
        where
          t.description ~~* '%tax%'::text
      ) as total_taxes,
      sum(tl.amount) filter (
        where
          t.type = 'repay'::transaction_type
      ) as repay_interest,
      sum(tl.amount) filter (
        where
          t.description ~~* '%Margin%'::text
      ) as margin_interest,
      sum(tl.amount) filter (
        where
          t.description ~~* '%Cash advance%'::text
      ) as cash_advance_interest
    from
      transactions t
      join transaction_legs tl on tl.transaction_id = t.id
      join assets a on a.id = tl.asset_id
    where
      a.ticker = any (array['EARNINGS'::text, 'CAPITAL'::text])
    group by
      (
        date_trunc(
          'month'::text,
          t.transaction_date::timestamp with time zone
        )::date
      )
  ),
  monthly_pnl as (
    select
      m_1.month_start,
      m_1.month_end,
      start_snapshot.net_equity_value as start_equity,
      end_snapshot.net_equity_value as end_equity,
      COALESCE(sum(dps.net_cash_flow), 0::numeric) as cash_flow,
      COALESCE(end_snapshot.net_equity_value, 0::numeric) - COALESCE(start_snapshot.net_equity_value, 0::numeric) - COALESCE(sum(dps.net_cash_flow), 0::numeric) as pnl
    from
      month_ranges m_1
      left join daily_performance_snapshots dps on dps.date >= m_1.month_start
      and dps.date <= m_1.month_end
      left join lateral (
        select
          s.net_equity_value
        from
          daily_performance_snapshots s
        where
          s.date < m_1.month_start
        order by
          s.date desc
        limit
          1
      ) start_snapshot on true
      left join lateral (
        select
          s.net_equity_value
        from
          daily_performance_snapshots s
        where
          s.date <= m_1.month_end
        order by
          s.date desc
        limit
          1
      ) end_snapshot on true
    group by
      m_1.month_start,
      m_1.month_end,
      start_snapshot.net_equity_value,
      end_snapshot.net_equity_value
  )
select
  m.month_start as date,
  mp.pnl,
  COALESCE(mt.repay_interest, 0::numeric) + COALESCE(mt.margin_interest, 0::numeric) + COALESCE(mt.cash_advance_interest, 0::numeric) as interest,
  COALESCE(mt.total_taxes, 0::numeric) as tax,
  COALESCE(mt.total_fees, 0::numeric) as fee
from
  month_ranges m
  left join monthly_pnl mp on mp.month_start = m.month_start
  left join monthly_transactions mt on mt.month = m.month_start
ORDER BY m.month_start DESC;
