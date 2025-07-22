create or replace function get_active_debts(p_user_id uuid)
returns setof debts
language sql
as $$
  select *
  from debts
  where status = 'active' and user_id = p_user_id;
$$;