-- 1. Update the queue_revalidation_jobs function to include daily_crypto_prices
CREATE OR REPLACE FUNCTION "public"."queue_revalidation_jobs"("table_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function now maps table changes to all affected cache tags and paths.
  
  -- A change in transactions, prices, rates, or debts affects performance data.
  IF table_name IN ('transactions', 'daily_stock_prices', 'daily_crypto_prices', 'daily_exchange_rates', 'debts') THEN
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('tag', 'performance-data') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/benchmark-chart') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/equity-chart') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/first-snapshot-date') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/monthly-pnl') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/monthly-twr') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/pnl') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/twr') ON CONFLICT DO NOTHING;
  END IF;
  -- A change in transactions, prices, rates, or debts also affects asset data.
  IF table_name IN ('transactions', 'daily_stock_prices', 'daily_crypto_prices', 'daily_exchange_rates', 'debts') THEN
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('tag', 'asset-data') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/asset-summary') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/stock-holdings') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/crypto-holdings') ON CONFLICT DO NOTHING;
  END IF;
  -- Specific paths for specific table changes
  IF table_name = 'transactions' THEN
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/monthly-expenses') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/transaction-feed') ON CONFLICT DO NOTHING;
  END IF;
  IF table_name = 'debts' THEN
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/debts') ON CONFLICT DO NOTHING;
  END IF;
  -- A change in market indices has a very limited impact
  IF table_name = 'daily_market_indices' THEN
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('tag', 'performance-data') ON CONFLICT DO NOTHING;
    INSERT INTO public.revalidation_queue (job_type, identifier) VALUES ('path', '/api/query/benchmark-chart') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 2. Add a trigger to the daily_crypto_prices table
CREATE TRIGGER handle_crypto_price_change
AFTER INSERT OR UPDATE OR DELETE ON public.daily_crypto_prices
FOR EACH ROW EXECUTE FUNCTION public.handle_table_change_and_queue();