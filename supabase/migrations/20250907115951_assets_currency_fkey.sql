alter table public.assets
  add constraint assets_currency_fkey
  foreign key (currency_code)
  references public.currencies (code)
  on update cascade
  on delete restrict;