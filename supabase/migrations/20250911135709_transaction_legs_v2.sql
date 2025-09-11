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
  -- fetch all transaction legs with their assets
  select coalesce(jsonb_agg(t), '[]'::jsonb)
  into legs
  from (
    select
      tl.id,
      tl.amount,
      tl.quantity,
      jsonb_build_object(
        'asset_class', a.asset_class,
        'name', a.name,
        'ticker', a.ticker,
        'logo_url', a.logo_url
      ) as assets
    from transaction_legs tl
    join assets a on tl.asset_id = a.id
    where tl.transaction_id = txn_id
  ) t;

  -- fetch associated expenses if requested
  if include_expenses then
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    into expenses
    from (
      select
        tr.description,
        jsonb_agg(
          jsonb_build_object('amount', tl.amount)
        ) as transaction_legs
      from transactions tr
      join transaction_legs tl on tr.id = tl.transaction_id
      where tr.linked_txn = txn_id
      group by tr.description
    ) e;
  end if;

  return jsonb_build_object(
    'legs', legs,
    'expenses', expenses
  );
end;
$$;
