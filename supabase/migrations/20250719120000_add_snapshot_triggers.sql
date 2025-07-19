-- Create a function to be called by the transaction trigger
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the snapshot generation function for the user who made the transaction
  -- from the transaction date to the current date.
  PERFORM public.generate_performance_snapshots(NEW.user_id, NEW.transaction_date, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires after a new transaction is inserted
CREATE TRIGGER on_new_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_transaction();

-- Create a function to be called by the stock price trigger
CREATE OR REPLACE FUNCTION public.handle_new_stock_price()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who hold the stock and trigger snapshot generation for them.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    WHERE a.security_id = NEW.security_id
  LOOP
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires after a new stock price is inserted or updated
CREATE TRIGGER on_new_stock_price
AFTER INSERT OR UPDATE ON public.daily_stock_prices
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_stock_price();

-- Create a function to be called by the exchange rate trigger
CREATE OR REPLACE FUNCTION public.handle_new_exchange_rate()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find all users who have assets in the updated currency and trigger snapshot generation.
  FOR user_record IN
    SELECT DISTINCT a.user_id
    FROM public.assets a
    JOIN public.securities s ON a.security_id = s.id
    WHERE s.currency_code = NEW.currency_code
  LOOP
    PERFORM public.generate_performance_snapshots(user_record.user_id, NEW.date, CURRENT_DATE);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires after a new exchange rate is inserted or updated
CREATE TRIGGER on_new_exchange_rate
AFTER INSERT OR UPDATE ON public.daily_exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_exchange_rate();