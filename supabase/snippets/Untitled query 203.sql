select
jsonb_agg(
  jsonb_build_object(
    'snapshot_date', sampled.snapshot_date,
    'net_equity', sampled.net_equity,
    'cumulative_cashflow', sampled.cumulative_cashflow
  ) order by sampled.snapshot_date
) as chartdata
from sampling_equity_data(
  '2026-01-01',
  now()::date,
  150
) sampled