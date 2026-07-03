
with
  month_ranges as (
    select
      date_trunc('month'::text, d.d)::date as month_start,
      LEAST(
        (
          date_trunc('month'::text, d.d) + '1 mon -1 days'::interval
        )::date,
        CURRENT_DATE
      ) as month_end
    from
      generate_series(
        '2021-11-01 00:00:00+00'::timestamp with time zone,
        CURRENT_DATE::timestamp with time zone,
        '1 mon'::interval
      ) d (d)
  ),
  users as (
    select distinct
      tx_entries.user_id
    from
      tx_entries
    where
      tx_entries.user_id is not null
  ),
  monthly_transactions as (
    select
      t.user_id,
      date_trunc('month'::text, t.created_at)::date as month,
      COALESCE(sum(s.fee), 0::numeric) + COALESCE(
        sum(cf.net_proceed) filter (
          where
            t.memo ~~* '%fee%'::text
        ),
        0::numeric
      ) as total_fees,
      COALESCE(sum(s.tax), 0::numeric) as total_taxes,
      COALESCE(sum(r.interest), 0::numeric) as loan_interest,
      COALESCE(
        sum(cf.net_proceed) filter (
          where
            t.memo ~~* '%interest%'::text
        ),
        0::numeric
      ) as margin_interest
    from
      tx_entries t
      left join tx_repay r on r.tx_id = t.id
      left join tx_stock s on s.tx_id = t.id
      left join tx_cashflow cf on cf.tx_id = t.id
    group by
      t.user_id,
      (date_trunc('month'::text, t.created_at)::date)
  ),
  monthly_pnl as (
    select
      m_1.month_start,
      m_1.month_end,
      u_1.user_id,
      start_s.net_equity as start_equity,
      end_s.net_equity as end_equity,
      COALESCE(sum(ds.net_cashflow), 0::numeric) as cash_flow,
      COALESCE(end_s.net_equity, 0::numeric) - COALESCE(start_s.net_equity, 0::numeric) - COALESCE(sum(ds.net_cashflow), 0::numeric) as pnl
    from
      month_ranges m_1
      cross join users u_1
      left join daily_snapshots ds on ds.snapshot_date >= m_1.month_start
      and ds.snapshot_date <= m_1.month_end
      and ds.user_id = u_1.user_id
      left join lateral (
        select
          s.net_equity
        from
          daily_snapshots s
        where
          s.user_id = u_1.user_id
          and s.snapshot_date < m_1.month_start
        order by
          s.snapshot_date desc
        limit
          1
      ) start_s on true
      left join lateral (
        select
          s.net_equity
        from
          daily_snapshots s
        where
          s.user_id = u_1.user_id
          and s.snapshot_date <= m_1.month_end
        order by
          s.snapshot_date desc
        limit
          1
      ) end_s on true
    group by
      m_1.month_start,
      m_1.month_end,
      u_1.user_id,
      start_s.net_equity,
      end_s.net_equity
  )
select
  m.month_start as snapshot_date,
  u.user_id,
  mp.pnl,
  COALESCE(mt.loan_interest, 0::numeric) + COALESCE(mt.margin_interest, 0::numeric) as interest,
  COALESCE(mt.total_taxes, 0::numeric) as tax,
  COALESCE(mt.total_fees, 0::numeric) as fee
from
  month_ranges m
  cross join users u
  left join monthly_pnl mp on mp.month_start = m.month_start
  and mp.user_id = u.user_id
  left join monthly_transactions mt on mt.month = m.month_start
  and mt.user_id = u.user_id;