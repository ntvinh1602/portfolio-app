select
  9999 as year,
  sum(GREATEST(intraday_cashflow, 0::numeric)) as deposits,
  sum(LEAST(intraday_cashflow, 0::numeric)) as withdrawals
from
  daily_snapshots
where
  user_id = auth.uid ();