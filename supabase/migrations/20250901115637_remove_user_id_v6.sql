alter table public.assets
drop column user_id;

alter table public.tax_lots
drop column user_id;

alter table public.transactions
drop column user_id;