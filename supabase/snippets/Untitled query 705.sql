create view public.benchmark_rollings
with
  (security_invoker = true) as
with
  periods as (
    select
      CURRENT_DATE as today,
      date_trunc(
        'year'::text,
        CURRENT_DATE::timestamp with time zone
      )::date as ytd_date,
      date_trunc(
        'month'::text,
        CURRENT_DATE::timestamp with time zone
      )::date as mtd_date,
      (
        select
          min(tx_entries.created_at)::date as min
        from
          tx_entries
      ) as inception_date,
      (CURRENT_DATE - '3 mons'::interval)::date as last3m_date,
      (CURRENT_DATE - '6 mons'::interval)::date as last6m_date,
      (CURRENT_DATE - '1 year'::interval)::date as last1y_date
  ),
  metrics as (
    select
      round(
        calculate_twr (periods.ytd_date, periods.today),
        3
      ) as twr_ytd,
      round(
        calculate_twr (periods.inception_date, periods.today),
        3
      ) as twr_all,
      periods.today,
      periods.inception_date
    from
      periods
  )
select
  m.twr_ytd,
  m.twr_all,
  case
    when m.today > m.inception_date
    and m.inception_date is not null then round(
      power(
        1::numeric + m.twr_all,
        1.0 / ((m.today - m.inception_date)::numeric / 365.25)
      ) - 1::numeric,
      3
    )
    else null::numeric
  end as cagr,
  rc.returnchart
from
  metrics m
  cross join lateral (
    select
      jsonb_build_object(
        'last_3m',
        get_return_chart (p.last3m_date, p.today),
        'last_6m',
        get_return_chart (p.last6m_date, p.today),
        'last_1y',
        get_return_chart (p.last1y_date, p.today),
        'all',
        get_return_chart (p.inception_date, p.today)
      ) as returnchart
    from
      periods p
  ) rc;