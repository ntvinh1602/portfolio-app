drop view if exists reports_data;
drop view if exists yearly_snapshots;

create or replace view public.yearly_snapshots WITH (security_invoker='on') as
with
annual_cashflow as (
  select
    extract(year from snapshot_date)::int as year,
    sum(case when net_cashflow > 0 then net_cashflow else 0 end) as deposits,
    sum(case when net_cashflow < 0 then net_cashflow else 0 end) as withdrawals
  from daily_snapshots
  group by 1
),
equity_year_bounds as (
  select
    extract(year from snapshot_date)::int as year,
    min(snapshot_date) as first_date,
    max(snapshot_date) as last_date
  from daily_snapshots
  where equity_index is not null
  group by 1
),
equity_values as (
  select
    b.year,
    ds_start.equity_index as first_value,
    ds_end.equity_index   as last_value
  from equity_year_bounds b
  join daily_snapshots ds_start
    on ds_start.snapshot_date = b.first_date
  join daily_snapshots ds_end
    on ds_end.snapshot_date = b.last_date
),
equity_returns as (
  select
    year,
    round(
      (last_value - first_value) / first_value * 100,
      2
    ) as equity_ret
  from equity_values
),
vn_year_bounds as (
  select
    extract(year from date)::int as year,
    min(date) as first_date,
    max(date) as last_date
  from daily_market_indices
  where symbol = 'VNINDEX'
    and close is not null
  group by 1
),
vn_values as (
  select
    b.year,
    v_start.close as first_value,
    v_end.close   as last_value
  from vn_year_bounds b
  join daily_market_indices v_start
    on v_start.date = b.first_date
   and v_start.symbol = 'VNINDEX'
  join daily_market_indices v_end
    on v_end.date = b.last_date
   and v_end.symbol = 'VNINDEX'
),
vn_returns as (
  select
    year,
    round(
      (last_value - first_value) / first_value * 100,
      2
    ) as vn_ret
  from vn_values
),
yearly_combined as (
  select
    coalesce(e.year, v.year) as year,
    e.equity_ret,
    v.vn_ret
  from equity_returns e
  full join vn_returns v using (year)
),
all_time_cashflow as (
  select
    sum(case when net_cashflow > 0 then net_cashflow else 0 end) as deposits,
    sum(case when net_cashflow < 0 then net_cashflow else 0 end) as withdrawals
  from daily_snapshots
),

all_time_equity as (
  select
    (select equity_index
     from daily_snapshots
     where equity_index is not null
     order by snapshot_date
     limit 1) as first_value,

    (select equity_index
     from daily_snapshots
     where equity_index is not null
     order by snapshot_date desc
     limit 1) as last_value
),

all_time_vn as (
  select
    (select close
     from daily_market_indices
     where symbol = 'VNINDEX'
     order by date
     limit 1) as first_value,

    (select close
     from daily_market_indices
     where symbol = 'VNINDEX'
     order by date desc
     limit 1) as last_value
),

all_time as (
  select
    9999 as year,
    round((ae.last_value - ae.first_value) / ae.first_value * 100, 2) as equity_ret,
    round((av.last_value - av.first_value) / av.first_value * 100, 2) as vn_ret,
    ac.deposits,
    ac.withdrawals
  from all_time_equity ae
  cross join all_time_vn av
  cross join all_time_cashflow ac
)
select
  yc.year,
  ac.deposits,
  ac.withdrawals,
  yc.equity_ret,
  yc.vn_ret
from yearly_combined yc
left join annual_cashflow ac using (year)

union all

select
  year,
  deposits,
  withdrawals,
  equity_ret,
  vn_ret
from all_time

order by year;

CREATE OR REPLACE VIEW public.reports_data WITH ("security_invoker"='on') AS
WITH stock_base AS (
  SELECT
    year,
    jsonb_agg(
      jsonb_build_object(
        'ticker', ticker,
        'name', name,
        'logo_url', logo_url,
        'total_pnl', total_pnl
      )
      ORDER BY ticker
    ) AS stock_pnl
  FROM
    public.stock_annual_pnl
  GROUP BY
    year
),
stock_all_time AS (
  SELECT
    9999 AS year,
    jsonb_agg(
      jsonb_build_object(
        'ticker', ticker,
        'name', name,
        'logo_url', logo_url,
        'total_pnl', total_pnl
      )
      ORDER BY ticker
    ) AS stock_pnl
  FROM (
    SELECT
      ticker,
      name,
      logo_url,
      SUM(total_pnl) AS total_pnl
    FROM
      public.stock_annual_pnl
    GROUP BY
      ticker, name, logo_url
  ) agg
),
profit_base AS (
  SELECT
    EXTRACT(YEAR FROM snapshot_date)::integer AS year,
    SUM(pnl) AS total_pnl,
    AVG(pnl) AS avg_profit,
    -AVG(interest + tax + fee) AS avg_expense,
    jsonb_agg(
      jsonb_build_object(
        'revenue', COALESCE(pnl, 0) + COALESCE(fee, 0) + COALESCE(interest, 0) + COALESCE(tax, 0),
        'fee', COALESCE(-fee, 0),
        'interest', COALESCE(-interest, 0),
        'tax', COALESCE(-tax, 0),
        'snapshot_date', snapshot_date::text
      )
      ORDER BY snapshot_date
    ) AS profit_chart
  FROM
    public.monthly_snapshots
  GROUP BY
    EXTRACT(YEAR FROM snapshot_date)
),
profit_all_time AS (
  SELECT
    9999 AS year,
    SUM(sum_pnl) AS total_pnl,
    AVG(sum_pnl) AS avg_profit,
    -AVG(sum_interest + sum_tax + sum_fee) AS avg_expense,
    jsonb_agg(
      jsonb_build_object(
        'revenue', COALESCE(sum_pnl, 0) + COALESCE(sum_fee, 0) + COALESCE(sum_interest, 0) + COALESCE(sum_tax, 0),
        'fee', COALESCE(-sum_fee, 0),
        'interest', COALESCE(-sum_interest, 0),
        'tax', COALESCE(-sum_tax, 0),
        'snapshot_date', year::text
      )
      ORDER BY year
    ) AS profit_chart
  FROM (
    SELECT
      EXTRACT(YEAR FROM snapshot_date)::integer AS year,
      SUM(pnl) AS sum_pnl,
      SUM(fee) AS sum_fee,
      SUM(interest) AS sum_interest,
      SUM(tax) AS sum_tax
    FROM
      public.monthly_snapshots
    GROUP BY
      EXTRACT(YEAR FROM snapshot_date)
  ) yearly
),
combined AS (
  SELECT
    b.year,
    b.stock_pnl,
    p.total_pnl,
    p.avg_profit,
    p.avg_expense,
    p.profit_chart
  FROM
    stock_base b
    LEFT JOIN profit_base p USING (year)
  UNION ALL
  SELECT
    s.year,
    s.stock_pnl,
    p.total_pnl,
    p.avg_profit,
    p.avg_expense,
    p.profit_chart
  FROM
    stock_all_time s
    LEFT JOIN profit_all_time p USING (year)
)
SELECT *
FROM combined
ORDER BY year;CREATE OR REPLACE VIEW public.reports_data AS
WITH stock_base AS (
  SELECT
    year,
    jsonb_agg(
      jsonb_build_object(
        'ticker', ticker,
        'name', name,
        'logo_url', logo_url,
        'total_pnl', total_pnl
      )
      ORDER BY ticker
    ) AS stock_pnl
  FROM
    public.stock_annual_pnl
  GROUP BY
    year
),
stock_all_time AS (
  SELECT
    9999 AS year,
    jsonb_agg(
      jsonb_build_object(
        'ticker', ticker,
        'name', name,
        'logo_url', logo_url,
        'total_pnl', total_pnl
      )
      ORDER BY ticker
    ) AS stock_pnl
  FROM (
    SELECT
      ticker,
      name,
      logo_url,
      SUM(total_pnl) AS total_pnl
    FROM
      public.stock_annual_pnl
    GROUP BY
      ticker, name, logo_url
  ) agg
),
profit_base AS (
  SELECT
    EXTRACT(YEAR FROM snapshot_date)::integer AS year,
    SUM(pnl) AS total_pnl,
    AVG(pnl) AS avg_profit,
    -AVG(interest + tax + fee) AS avg_expense,
    jsonb_agg(
      jsonb_build_object(
        'revenue', COALESCE(pnl, 0) + COALESCE(fee, 0) + COALESCE(interest, 0) + COALESCE(tax, 0),
        'fee', COALESCE(-fee, 0),
        'interest', COALESCE(-interest, 0),
        'tax', COALESCE(-tax, 0),
        'snapshot_date', snapshot_date::text
      )
      ORDER BY snapshot_date
    ) AS profit_chart
  FROM
    public.monthly_snapshots
  GROUP BY
    EXTRACT(YEAR FROM snapshot_date)
),
profit_all_time AS (
  SELECT
    9999 AS year,
    SUM(sum_pnl) AS total_pnl,
    AVG(sum_pnl) AS avg_profit,
    -AVG(sum_interest + sum_tax + sum_fee) AS avg_expense,
    jsonb_agg(
      jsonb_build_object(
        'revenue', COALESCE(sum_pnl, 0) + COALESCE(sum_fee, 0) + COALESCE(sum_interest, 0) + COALESCE(sum_tax, 0),
        'fee', COALESCE(-sum_fee, 0),
        'interest', COALESCE(-sum_interest, 0),
        'tax', COALESCE(-sum_tax, 0),
        'snapshot_date', year::text
      )
      ORDER BY year
    ) AS profit_chart
  FROM (
    SELECT
      EXTRACT(YEAR FROM snapshot_date)::integer AS year,
      SUM(pnl) AS sum_pnl,
      SUM(fee) AS sum_fee,
      SUM(interest) AS sum_interest,
      SUM(tax) AS sum_tax
    FROM
      public.monthly_snapshots
    GROUP BY
      EXTRACT(YEAR FROM snapshot_date)
  ) yearly
),
combined as (
  select
    b.year,
    b.stock_pnl,
    p.total_pnl,
    p.avg_profit,
    p.avg_expense,
    p.profit_chart,
    ys.deposits,
    ys.withdrawals,
    ys.equity_ret,
    ys.vn_ret
  from
    stock_base b
    left join profit_base p using (year)
    left join yearly_snapshots ys using (year)

  union all

  select
    s.year,
    s.stock_pnl,
    p.total_pnl,
    p.avg_profit,
    p.avg_expense,
    p.profit_chart,
    ys.deposits,
    ys.withdrawals,
    ys.equity_ret,
    ys.vn_ret
  from
    stock_all_time s
    left join profit_all_time p using (year)
    left join yearly_snapshots ys using (year)
)
select
  year,
  stock_pnl,
  total_pnl,
  avg_profit,
  avg_expense,
  profit_chart,
  deposits,
  withdrawals,
  equity_ret,
  vn_ret
from
  combined
order by
  year;