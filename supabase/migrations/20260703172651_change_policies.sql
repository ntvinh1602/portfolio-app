SET check_function_bodies = false;
ALTER FUNCTION public.add_borrow_event(numeric, text, numeric) SECURITY INVOKER;
ALTER FUNCTION public.add_cashflow_event(text, uuid, numeric, numeric, text) SECURITY INVOKER;
ALTER FUNCTION public.add_repay_event(uuid, numeric) SECURITY INVOKER;
ALTER FUNCTION public.add_stock_event(text, text, numeric, numeric, numeric, numeric, uuid) SECURITY INVOKER;
CREATE OR REPLACE FUNCTION public.refresh_daily_snapshots()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
  refresh materialized view public.daily_snapshots;
  return null;
end;$function$;
