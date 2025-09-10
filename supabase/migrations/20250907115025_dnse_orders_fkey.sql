alter table public.dnse_orders
  add constraint dnse_orders_symbol_fkey
  foreign key (symbol)
  references public.assets (ticker)
  on update cascade
  on delete restrict;
