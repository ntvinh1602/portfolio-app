DROP TRIGGER "snapshot_after_new_transaction" ON public.transactions;
DROP TRIGGER "transaction-revalidation" ON public.transactions;
DROP TRIGGER "update_assets_on_new_transaction" ON public.transactions;

CREATE OR REPLACE TRIGGER "snapshot_after_new_transaction" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_transaction"();
CREATE OR REPLACE TRIGGER "transaction_revalidation" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://portapp-vinh.vercel.app/api/revalidate', 'POST', '{"x-secret-token":"8PuQYxYnnEH80AvU1HePoSCuorsEFc9d"}', '{}', '5000');
CREATE OR REPLACE TRIGGER "update_assets_on_new_transaction" AFTER INSERT OR UPDATE ON "public"."transaction_legs" FOR EACH ROW EXECUTE FUNCTION "public"."update_assets_after_transaction"();
