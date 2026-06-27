--create materialized view public.dashboard_data as
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
      '2000-01-01'::date as inception_date,
      (CURRENT_DATE - '3 mons'::interval)::date as last3m_date,
      (CURRENT_DATE - '6 mons'::interval)::date as last6m_date,
      (CURRENT_DATE - '1 year'::interval)::date as last1y_date
  ),
  pnl as (
    select
      calculate_pnl (periods.ytd_date, periods.today) as pnl_ytd,
      calculate_pnl (periods.mtd_date, periods.today) as pnl_mtd
    from
      periods
  ),
  twr as (
    select
      calculate_twr (periods.ytd_date, periods.today) as twr_ytd,
      calculate_twr (periods.inception_date, periods.today) as twr_all,
      case
        when periods.today > periods.inception_date then power(
          1::numeric + calculate_twr (periods.inception_date, periods.today),
          1.0 / (
            (
              periods.today - (
                (
                  select
                    min(monthly_snapshots.snapshot_date) as min
                  from
                    monthly_snapshots
                )
              )
            )::numeric / 365.25
          )
        ) - 1::numeric
        else null::numeric
      end as cagr
    from
      periods
  ),
  equity_chart as (
    select
      jsonb_build_array(
        
        get_equity_chart (periods.last3m_date, periods.today, 3),
        'last_6m',
        get_equity_chart (periods.last6m_date, periods.today, 3),
        'last_1y',
        get_equity_chart (periods.last1y_date, periods.today, 3),
        'all',
        get_equity_chart (periods.inception_date, periods.today, 3)
      ) as equitychart
    from
      periods
  ),
  return_chart as (
    select
      jsonb_build_object(
        'last_3m',
        get_return_chart (periods.last3m_date, periods.today, 150),
        'last_6m',
        get_return_chart (periods.last6m_date, periods.today, 150),
        'last_1y',
        get_return_chart (periods.last1y_date, periods.today, 150),
        'all',
        get_return_chart (periods.inception_date, periods.today, 150)
      ) as returnchart
    from
      periods
  ),
  balance as (
    select
      sum(bs.total_value) filter (
        where
          bs.asset_class = 'equity'::asset_class
      ) as total_equity,
      sum(bs.total_value) filter (
        where
          bs.asset_class = 'liability'::asset_class
      ) as total_liabilities,
      sum(bs.total_value) filter (
        where
          bs.asset_class = 'fund'::asset_class
      ) as fund,
      sum(bs.total_value) filter (
        where
          bs.asset_class = 'stock'::asset_class
      ) as stock,
      sum(bs.total_value) filter (
        where
          bs.asset_class = 'cash'::asset_class
      ) as cash,
      max(bs.total_value) filter (
        where
          bs.ticker = 'MARGIN'::text
      ) as margin
    from
      balance_sheet bs
  ),
  debt as (
    select
      sum(od.principal + od.interest) as debts
    from
      outstanding_debts od
  ),
  monthly as (
    select
      sum(last_12.pnl) as total_pnl,
      avg(last_12.pnl) as avg_profit,
      - avg(last_12.interest + last_12.tax + last_12.fee) as avg_expense,
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'revenue',
              COALESCE(last_12.pnl, 0::numeric) + COALESCE(last_12.fee, 0::numeric) + COALESCE(last_12.interest, 0::numeric) + COALESCE(last_12.tax, 0::numeric),
              'fee',
              COALESCE(- last_12.fee, 0::numeric),
              'interest',
              COALESCE(- last_12.interest, 0::numeric),
              'tax',
              COALESCE(- last_12.tax, 0::numeric),
              'snapshot_date',
              last_12.snapshot_date::text
            )
            order by
              last_12.snapshot_date
          ) as jsonb_agg
      ) as profit_chart
    from
      (
        select
          ms.snapshot_date,
          ms.pnl,
          ms.interest,
          ms.tax,
          ms.fee
        from
          monthly_snapshots ms
        order by
          ms.snapshot_date desc
        limit
          12
      ) last_12
  ),
  stock_positions as (
    select
      jsonb_agg(
        jsonb_build_object(
          'ticker',
          sh.ticker,
          'name',
          sh.name,
          'logo_url',
          sh.logo_url,
          'quantity',
          sh.quantity,
          'cost_basis',
          sh.cost_basis,
          'price',
          sh.price
        )
        order by
          sh.ticker
      ) as stock_list
    from
      stock_holdings sh
  )
select
  pnl.pnl_ytd,
  pnl.pnl_mtd,
  twr.twr_ytd,
  twr.twr_all,
  twr.cagr,
  balance.total_equity,
  balance.total_liabilities,
  balance.fund,
  balance.stock,
  balance.cash,
  balance.margin,
  debt.debts,
  monthly.total_pnl,
  monthly.avg_profit,
  monthly.avg_expense,
  monthly.profit_chart,
  stock_positions.stock_list,
  equity_chart.equitychart,
  return_chart.returnchart
from
  pnl
  cross join twr
  cross join balance
  cross join debt
  cross join monthly
  cross join stock_positions
  cross join equity_chart
  cross join return_chart;