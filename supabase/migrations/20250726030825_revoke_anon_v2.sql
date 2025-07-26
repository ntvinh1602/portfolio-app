ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
REVOKE ALL ON TABLES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
REVOKE ALL ON FUNCTIONS FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
REVOKE ALL ON SEQUENCES FROM "anon";
COMMENT ON COLUMN "public"."lot_consumptions"."tax_lot_id" IS NULL;
COMMENT ON COLUMN "public"."lot_consumptions"."quantity_consumed" IS NULL;
COMMENT ON COLUMN "public"."profiles"."display_name" IS NULL;
COMMENT ON COLUMN "public"."tax_lots"."origin" IS NULL;
COMMENT ON COLUMN "public"."tax_lots"."remaining_quantity" IS NULL;
COMMENT ON SCHEMA "public" IS NULL;


drop policy "Guests can read demo user accounts" ON "public"."accounts";
drop policy "Guests can read demo user assets" ON "public"."assets";
drop policy "Guests can read demo user debts" ON "public"."debts";
drop policy "Guests can read demo user lot consumptions" ON "public"."lot_consumptions";
drop policy "Guests can read demo user performance snapshots" ON "public"."daily_performance_snapshots";
drop policy "Guests can read demo user profile" ON "public"."profiles";
drop policy "Guests can read demo user tax lots" ON "public"."tax_lots";
drop policy "Guests can read demo user transaction_legs" ON "public"."transaction_legs";
drop policy "Guests can read demo user transactions" ON "public"."transactions";
drop policy "Guests can read details of demo user transactions" ON "public"."transaction_details";
drop policy "Guests including anonymous can read crypto prices" ON "public"."daily_crypto_prices";
drop policy "Guests including anonymous can read exchange rates" ON "public"."daily_exchange_rates";
drop policy "Guests including anonymous can read market indices" ON "public"."daily_market_indices";
drop policy "Guests including anonymous can read stock prices" ON "public"."daily_stock_prices";