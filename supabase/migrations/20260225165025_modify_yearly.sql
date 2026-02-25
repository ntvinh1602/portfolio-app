drop view if exists yearly_snapshots;

CREATE OR REPLACE VIEW public.yearly_snapshots WITH (security_invoker='on') AS
 WITH annual_cashflow AS (
         SELECT (EXTRACT(year FROM daily_snapshots.snapshot_date))::integer AS year,
            sum(
                CASE
                    WHEN (daily_snapshots.net_cashflow > (0)::numeric) THEN daily_snapshots.net_cashflow
                    ELSE (0)::numeric
                END) AS deposits,
            sum(
                CASE
                    WHEN (daily_snapshots.net_cashflow < (0)::numeric) THEN daily_snapshots.net_cashflow
                    ELSE (0)::numeric
                END) AS withdrawals
           FROM public.daily_snapshots
          GROUP BY (EXTRACT(year FROM daily_snapshots.snapshot_date))
        ), equity_data AS (
         SELECT EXTRACT(year FROM daily_snapshots.snapshot_date) AS yr,
            daily_snapshots.snapshot_date AS dps_date,
            daily_snapshots.equity_index
           FROM public.daily_snapshots
          WHERE (daily_snapshots.equity_index IS NOT NULL)
        ), equity_end_of_year AS (
         SELECT equity_data.yr,
            max(equity_data.dps_date) AS last_date
           FROM equity_data
          GROUP BY equity_data.yr
        ), equity_with_prev AS (
         SELECT e.yr,
            eoy.last_date,
            e.equity_index AS end_value,
            lag(e.equity_index) OVER (ORDER BY e.yr) AS start_value
           FROM (equity_end_of_year eoy
             JOIN equity_data e ON ((e.dps_date = eoy.last_date)))
        ), vnindex_data AS (
         SELECT EXTRACT(year FROM daily_market_indices.date) AS yr,
            daily_market_indices.date AS dmi_date,
            daily_market_indices.close
           FROM public.daily_market_indices
          WHERE ((daily_market_indices.symbol = 'VNINDEX'::text) AND (daily_market_indices.close IS NOT NULL))
        ), vnindex_end_of_year AS (
         SELECT vnindex_data.yr,
            max(vnindex_data.dmi_date) AS last_date
           FROM vnindex_data
          GROUP BY vnindex_data.yr
        ), vnindex_with_prev AS (
         SELECT v.yr,
            voy.last_date,
            v.close AS end_value,
            lag(v.close) OVER (ORDER BY v.yr) AS start_value
           FROM (vnindex_end_of_year voy
             JOIN vnindex_data v ON ((v.dmi_date = voy.last_date)))
        ), yearly_returns AS (
         SELECT (COALESCE(e.yr, v.yr))::integer AS year,
            round((((e.end_value - e.start_value) / e.start_value) * (100)::numeric), 2) AS equity_ret,
            round((((v.end_value - v.start_value) / v.start_value) * (100)::numeric), 2) AS vn_ret
           FROM (equity_with_prev e
             FULL JOIN vnindex_with_prev v ON ((e.yr = v.yr)))
          WHERE ((e.start_value IS NOT NULL) OR (v.start_value IS NOT NULL))
        ), all_time_cashflow AS (
         SELECT sum(
                CASE
                    WHEN (daily_snapshots.net_cashflow > (0)::numeric) THEN daily_snapshots.net_cashflow
                    ELSE (0)::numeric
                END) AS deposits,
            sum(
                CASE
                    WHEN (daily_snapshots.net_cashflow < (0)::numeric) THEN daily_snapshots.net_cashflow
                    ELSE (0)::numeric
                END) AS withdrawals
           FROM public.daily_snapshots
        ), scalar_values AS (
         SELECT ( SELECT daily_snapshots.equity_index
                   FROM public.daily_snapshots
                  ORDER BY daily_snapshots.snapshot_date
                 LIMIT 1) AS first_equity,
            ( SELECT daily_snapshots.equity_index
                   FROM public.daily_snapshots
                  ORDER BY daily_snapshots.snapshot_date DESC
                 LIMIT 1) AS last_equity,
            ( SELECT daily_market_indices.close
                   FROM public.daily_market_indices
                  WHERE (daily_market_indices.symbol = 'VNINDEX'::text)
                  ORDER BY daily_market_indices.date
                 LIMIT 1) AS first_vnindex,
            ( SELECT daily_market_indices.close
                   FROM public.daily_market_indices
                  WHERE (daily_market_indices.symbol = 'VNINDEX'::text)
                  ORDER BY daily_market_indices.date DESC
                 LIMIT 1) AS last_vnindex
        ), all_time AS (
         SELECT 9999 AS year,
            round((((sv.last_equity - sv.first_equity) / sv.first_equity) * (100)::numeric), 2) AS equity_ret,
            round((((sv.last_vnindex - sv.first_vnindex) / sv.first_vnindex) * (100)::numeric), 2) AS vn_ret,
            ac.deposits,
            ac.withdrawals
           FROM (scalar_values sv
             CROSS JOIN all_time_cashflow ac)
        ), yearly_combined AS (
         SELECT yr.year,
            cf.deposits,
            cf.withdrawals,
            yr.equity_ret,
            yr.vn_ret
           FROM (yearly_returns yr
             LEFT JOIN annual_cashflow cf ON ((yr.year = cf.year)))
        ), combined AS (
         SELECT yearly_combined.year,
            yearly_combined.deposits,
            yearly_combined.withdrawals,
            yearly_combined.equity_ret,
            yearly_combined.vn_ret
           FROM yearly_combined
        UNION ALL
         SELECT all_time.year,
            all_time.deposits,
            all_time.withdrawals,
            all_time.equity_ret,
            all_time.vn_ret
           FROM all_time
        )
select
  year,
  deposits,
  withdrawals,
  equity_ret,
  vn_ret
from
  combined
order by
  year;;