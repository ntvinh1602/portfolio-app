drop function if exists "public"."queue_revalidation_jobs"(text);
DROP TRIGGER IF EXISTS handle_crypto_price_change ON daily_crypto_prices;
DROP TRIGGER IF EXISTS on_daily_exchange_rates_change ON daily_exchange_rates;
DROP TRIGGER IF EXISTS on_daily_market_indices_change ON daily_market_indices;
DROP TRIGGER IF EXISTS on_daily_stock_prices_change ON daily_stock_prices;
DROP TRIGGER IF EXISTS on_debts_change ON debts;
DROP TRIGGER IF EXISTS on_new_exchange_rate ON daily_exchange_rates;
DROP TRIGGER IF EXISTS on_new_stock_price ON daily_stock_prices;
DROP TRIGGER IF EXISTS on_new_transaction ON transactions;
DROP TRIGGER IF EXISTS on_transactions_change ON transactions;






drop function if exists "public"."handle_table_change_and_queue"();