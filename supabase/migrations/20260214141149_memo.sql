CREATE TYPE cashflow_ops AS ENUM ('deposit', 'withdraw', 'income', 'expense');

create table public.cashflow_memo (
  id uuid not null default gen_random_uuid (),
  operation public.cashflow_ops not null,
  memo text not null
) TABLESPACE pg_default;