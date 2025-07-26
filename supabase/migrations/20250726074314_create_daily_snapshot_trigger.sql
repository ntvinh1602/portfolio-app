create trigger "snapshot_after_new_transaction"
after insert on "public"."transactions"
for each row
execute function handle_new_transaction();

create trigger "snapshot_after_new_stock_price"
after insert or update on "public"."daily_stock_prices"
for each statement
execute function handle_new_stock_price();

create trigger "snapshot_after_New_fx_rate"
after insert or update on "public"."daily_exchange_rates"
for each statement
execute function handle_new_exchange_rate();