drop view if exists reports_data;

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
), date_bounds AS (
  SELECT
    year,
    CASE 
      WHEN year = 9999 
        THEN (SELECT MIN(snapshot_date)::date FROM public.daily_snapshots)
      ELSE make_date(year, 1, 1)
    END AS start_date,
    CASE 
      WHEN year = 9999 
        THEN (SELECT MAX(snapshot_date)::date FROM public.daily_snapshots)
      ELSE make_date(year, 12, 31)
    END AS end_date
  FROM (
    SELECT year FROM stock_base
    UNION
    SELECT year FROM stock_all_time
  ) y
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
  c.year,
  c.stock_pnl,
  c.total_pnl,
  c.avg_profit,
  c.avg_expense,
  c.profit_chart,
  c.deposits,
  c.withdrawals,
  c.equity_ret,
  c.vn_ret,
  get_return_chart(db.start_date, db.end_date, 150) AS return_chart
from
  combined c
  join date_bounds db using (year)
order by
  c.year;