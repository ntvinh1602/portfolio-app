create or replace function get_first_snapshot_date(p_user_id uuid)
returns date
security definer
language sql
as $$
  select date
  from daily_performance_snapshots
  where user_id = p_user_id
  order by date asc
  limit 1;
$$;