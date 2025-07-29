DROP TRIGGER "snapshot_after_New_fx_rate" ON "public"."daily_exchange_rates";

CREATE TRIGGER "snapshot_after_new_fx_rate"
    AFTER INSERT OR UPDATE ON "public"."daily_exchange_rates"
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_exchange_rate();

DROP TRIGGER "snapshot_after_new_stock_price" ON "public"."daily_stock_prices";

CREATE TRIGGER "snapshot_after_new_stock_price"
    AFTER INSERT OR UPDATE ON "public"."daily_stock_prices"
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_stock_price();