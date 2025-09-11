create or replace function get_transaction_details(
  txn_id uuid,
  include_expenses boolean default false
)
returns jsonb
language plpgsql
SET "search_path" TO 'public'
as $$
declare
  legs jsonb;
  expenses jsonb := '[]'::jsonb;
begin
  -- fetch legs
  select jsonb_agg(t)
  into legs
  from (
    select tl.*, a.name, a.ticker, a.asset_class, a.logo_url
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where tl.transaction_id = txn_id
  ) t;

  -- fetch expenses if requested
  if include_expenses then
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    into expenses
    from (
      select tr.description, jsonb_agg(tl.amount) as amounts
      from transactions tr
      join transaction_legs tl on tr.id = tl.transaction_id
      where tr.linked_txn = txn_id
      group by tr.description
    ) e;
  end if;

  return jsonb_build_object(
    'legs', coalesce(legs, '[]'::jsonb),
    'expenses', expenses
  );
end;
$$;
