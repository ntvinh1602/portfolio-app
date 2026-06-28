--create materialized view public.daily_snapshots as
with
  dates as (
    select
      generate_series(
        GREATEST(
          '2021-11-09'::date,
          COALESCE(
            (
              select
                min(tx_entries.created_at)::date as min
              from
                tx_entries
            ),
            '2021-11-09'::date
          )
        )::timestamp with time zone,
        CURRENT_DATE::timestamp with time zone,
        '1 day'::interval
      )::date as snapshot_date
  ),
  business_days as (
    select
      dates.snapshot_date
    from
      dates
    where
      EXTRACT(
        isodow
        from
          dates.snapshot_date
      ) <> all (array[6::numeric, 7::numeric])
  ),
  daily_deltas as (
    select
      e.created_at::date as activity_date,
      tl.asset_id,
      a.currency_code,
      sum(tl.quantity) as dq
    from
      tx_legs tl
      join tx_entries e on e.id = tl.tx_id
      join assets a on a.id = tl.asset_id
    where
      a.asset_class <> all (
        array['equity'::asset_class, 'liability'::asset_class]
      )
    group by
      (e.created_at::date),
      tl.asset_id,
      a.currency_code
  ),
  asset_intervals as (
    select
      daily_deltas.asset_id,
      daily_deltas.currency_code,
      sum(daily_deltas.dq) over (
        partition by
          daily_deltas.asset_id,
          daily_deltas.currency_code
        order by
          daily_deltas.activity_date rows between UNBOUNDED PRECEDING
          and CURRENT row
      ) as cum_qty,
      daily_deltas.activity_date as valid_from,
      COALESCE(
        lead(daily_deltas.activity_date) over (
          partition by
            daily_deltas.asset_id,
            daily_deltas.currency_code
          order by
            daily_deltas.activity_date
        ),
        'infinity'::date
      ) as valid_to
    from
      daily_deltas
  ),
  positions as (
    select
      gs.d::date as snapshot_date,
      ai.asset_id,
      ai.currency_code,
      ai.cum_qty as quantity
    from
      asset_intervals ai
      cross join lateral generate_series(
        GREATEST(
          ai.valid_from,
          GREATEST(
            '2021-11-09'::date,
            COALESCE(
              (
                select
                  min(tx_entries.created_at)::date as min
                from
                  tx_entries
              ),
              '2021-11-09'::date
            )
          )
        )::timestamp without time zone,
        LEAST(ai.valid_to - 1, CURRENT_DATE)::timestamp without time zone,
        '1 day'::interval
      ) gs (d)
    where
      EXTRACT(
        isodow
        from
          gs.d
      ) <> all (array[6::numeric, 7::numeric])
  ),
  total_assets_per_day as (
    select
      pos.snapshot_date,
      COALESCE(
        sum(
          pos.quantity * COALESCE(pr.price, 1::numeric) * COALESCE(fx.rate, 1::numeric)
        ),
        0::numeric
      ) as total_assets
    from
      positions pos
      left join lateral (
        select
          hp.close as price
        from
          historical_prices hp
        where
          hp.asset_id = pos.asset_id
          and hp.date <= pos.snapshot_date
        order by
          hp.date desc
        limit
          1
      ) pr on true
      left join lateral (
        select
          hf.rate
        from
          historical_fxrate hf
        where
          hf.currency_code = pos.currency_code
          and hf.date <= pos.snapshot_date
        order by
          hf.date desc
        limit
          1
      ) fx on true
    group by
      pos.snapshot_date
  ),
  debt_events as (
    select
      b.tx_id as borrow_tx_id,
      b.principal,
      b.rate,
      e_b.created_at::date as borrow_date,
      e_r.created_at::date as repay_date
    from
      tx_debt b
      join tx_entries e_b on e_b.id = b.tx_id
      left join tx_debt r on r.repay_tx = b.tx_id
      and r.operation = 'repay'::text
      left join tx_entries e_r on e_r.id = r.tx_id
    where
      b.operation = 'borrow'::text
  ),
  debt_balances_by_day as (
    select
      d.snapshot_date,
      de.borrow_tx_id,
      de.principal,
      de.rate,
      de.borrow_date,
      de.repay_date,
      case
        when de.repay_date is not null
        and de.repay_date <= d.snapshot_date then 0::numeric
        else de.principal * power(
          1::numeric + de.rate / 100.0 / 365.0,
          GREATEST(d.snapshot_date - de.borrow_date, 0)::numeric
        )
      end as balance_at_date
    from
      debt_events de
      cross join business_days d
    where
      de.borrow_date <= d.snapshot_date
  ),
  total_liabilities_per_day as (
    select
      debt_balances_by_day.snapshot_date,
      COALESCE(
        sum(debt_balances_by_day.balance_at_date),
        0::numeric
      ) as total_liabilities
    from
      debt_balances_by_day
    group by
      debt_balances_by_day.snapshot_date
  ),
  net_cashflow_per_day as (
    select
      e.created_at::date as snapshot_date,
      COALESCE(sum(tl.credit) - sum(tl.debit), 0::numeric) as net_cashflow
    from
      tx_entries e
      join tx_legs tl on tl.tx_id = e.id
      join assets a on a.id = tl.asset_id
      join tx_cashflow cf on cf.tx_id = e.id
    where
      (
        cf.operation = any (
          array['deposit'::cashflow_ops, 'withdraw'::cashflow_ops]
        )
      )
      and a.asset_class = 'equity'::asset_class
    group by
      (e.created_at::date)
  ),
  base as (
    select
      d.snapshot_date,
      COALESCE(tad.total_assets, 0::numeric) as total_assets,
      COALESCE(tld.total_liabilities, 0::numeric) as total_liabilities,
      COALESCE(nc.net_cashflow, 0::numeric) as net_cashflow,
      COALESCE(tad.total_assets, 0::numeric) - COALESCE(tld.total_liabilities, 0::numeric) as net_equity
    from
      business_days d
      left join total_assets_per_day tad on tad.snapshot_date = d.snapshot_date
      left join total_liabilities_per_day tld on tld.snapshot_date = d.snapshot_date
      left join net_cashflow_per_day nc on nc.snapshot_date = d.snapshot_date
  ),
  with_returns as (
    select
      b.snapshot_date,
      b.total_assets,
      b.total_liabilities,
      b.net_equity,
      b.net_cashflow,
      COALESCE(
        sum(b.net_cashflow) over (
          order by
            b.snapshot_date rows between UNBOUNDED PRECEDING
            and CURRENT row
        ),
        0::numeric
      ) as cumulative_cashflow,
      case
        when lag(b.net_equity) over (
          order by
            b.snapshot_date
        ) is null then 0::numeric
        when lag(b.net_equity) over (
          order by
            b.snapshot_date
        ) = 0::numeric then 0::numeric
        else (
          b.net_equity - b.net_cashflow - lag(b.net_equity) over (
            order by
              b.snapshot_date
          )
        ) / NULLIF(
          lag(b.net_equity) over (
            order by
              b.snapshot_date
          ),
          0::numeric
        )
      end as daily_return
    from
      base b
  ),
  with_index as (
    select
      with_returns.snapshot_date,
      with_returns.total_assets,
      with_returns.total_liabilities,
      with_returns.net_equity,
      with_returns.net_cashflow,
      with_returns.cumulative_cashflow,
      with_returns.daily_return,
      COALESCE(
        1::numeric + with_returns.daily_return,
        1::numeric
      ) as factor,
      exp(
        sum(
          ln(
            GREATEST(
              abs(
                COALESCE(
                  1::numeric + with_returns.daily_return,
                  1::numeric
                )
              ),
              0.000000000001
            )
          )
        ) over (
          order by
            with_returns.snapshot_date
        )
      ) * 100::numeric * case
        when (
          count(*) filter (
            where
              (1::numeric + with_returns.daily_return) < 0::numeric
          ) over (
            order by
              with_returns.snapshot_date
          ) % 2::bigint
        ) = 1 then '-1'::integer
        else 1
      end::numeric as equity_index
    from
      with_returns
  )
select
  snapshot_date,
  total_assets,
  total_liabilities,
  net_equity,
  net_cashflow,
  cumulative_cashflow,
  equity_index
from
  with_index;