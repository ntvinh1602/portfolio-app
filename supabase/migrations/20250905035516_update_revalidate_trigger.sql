DROP TRIGGER IF EXISTS fx_rate_revalidation ON public.daily_exchange_rates;
DROP TRIGGER IF EXISTS stock_price_revalidation ON public.daily_stock_prices;
DROP TRIGGER IF EXISTS transaction_revalidation ON public.transaction_legs;

drop function if exists public.call_vercel_revalidate();