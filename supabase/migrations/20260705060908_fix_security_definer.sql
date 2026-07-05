SET check_function_bodies = false;
DROP POLICY "Enable insert for authenticated users only" ON flight.flights;
ALTER TABLE public.assets DROP COLUMN is_active;
ALTER TABLE public.dnse_order_events ALTER COLUMN id TYPE integer USING id::integer;
DROP INDEX public.dnse_order_events_order_status_idx;
DROP TRIGGER after_new_m1_close ON public.m1_intraday_close;
DROP TABLE public.m1_intraday_close;
CREATE POLICY "Enable insert for users based on user_id" ON flight.flights FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE TYPE public.dnse_order_status AS ENUM ('Pending', 'PendingNew', 'New', 'PartiallyFilled', 'Filled', 'PendingReplace', 'PendingCancel', 'Canceled', 'Rejected', 'Expired', 'DoneForDay');
CREATE OR REPLACE FUNCTION public.active_stock_tickers()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$select coalesce(
  jsonb_agg(ticker order by ticker),
  '[]'::jsonb
)
from (
  select a.ticker
  from public.tx_legs l
  join public.assets a on a.id = l.asset_id
  where a.asset_class = 'stock'
  group by a.ticker
  having sum(l.quantity) > 0

  union

  select 'VNINDEX' as ticker
) t(ticker);$function$;
ALTER FUNCTION public.calculate_pnl(date, date) SECURITY INVOKER;
ALTER FUNCTION public.calculate_twr(date, date) SECURITY INVOKER;
ALTER FUNCTION public.get_equity_chart(date, date, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_return_chart(date, date, integer) SECURITY INVOKER;
ALTER FUNCTION public.process_dnse_order() SECURITY INVOKER;
ALTER FUNCTION public.process_tx_borrow(p_tx_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.process_tx_cashflow(uuid) SECURITY INVOKER;
ALTER FUNCTION public.process_tx_repay(uuid) SECURITY INVOKER;
ALTER FUNCTION public.process_tx_stock(uuid) SECURITY INVOKER;
CREATE OR REPLACE FUNCTION public.rebuild_ledger()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare
    tx record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;

    -- Step 2: replay all transactions in chronological order
    for tx in
        select id, category, created_at
        from public.tx_entries
        order by created_at asc
    loop
        case tx.category
            when 'stock'::tx_category then
                perform public.process_tx_stock(tx.id);

            when 'cashflow'::tx_category then
                perform public.process_tx_cashflow(tx.id);

            when 'borrow'::tx_category then
                perform public.process_tx_borrow(tx.id);

            when 'repay'::tx_category then
                perform public.process_tx_repay(tx.id);

            else
                raise exception 'Unhandled tx category: %', tx.category;
        end case;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;$function$;
ALTER FUNCTION public.refresh_daily_snapshots() SET search_path TO public;
ALTER FUNCTION public.trg_process_tx_borrow() SECURITY INVOKER;
ALTER FUNCTION public.trg_process_tx_cashflow() SECURITY INVOKER;
ALTER FUNCTION public.trg_process_tx_repay() SECURITY INVOKER;
ALTER FUNCTION public.trg_process_tx_stock() SECURITY INVOKER;
ALTER FUNCTION public.upsert_historical_prices() SECURITY INVOKER;
ALTER TABLE public.dnse_order_events ALTER COLUMN order_status TYPE public.dnse_order_status USING order_status::public.dnse_order_status;
ALTER TABLE public.dnse_order_events ALTER COLUMN side TYPE public.stock_ops USING side::public.stock_ops;
CREATE TABLE public.dnse_m1_close (symbol text NOT NULL, close numeric NOT NULL, volume bigint NOT NULL, last_updated timestamp with time zone NOT NULL, received_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.dnse_m1_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnse_m1_close ADD CONSTRAINT m1_intraday_close_pkey PRIMARY KEY (symbol, last_updated);
ALTER TABLE public.dnse_m1_close ADD CONSTRAINT m1_intraday_close_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.assets(ticker) ON UPDATE CASCADE ON DELETE CASCADE;
GRANT ALL ON public.dnse_m1_close TO anon;
GRANT ALL ON public.dnse_m1_close TO authenticated;
GRANT ALL ON public.dnse_m1_close TO service_role;
CREATE TRIGGER after_new_m1_close AFTER INSERT ON public.dnse_m1_close FOR EACH ROW EXECUTE FUNCTION public.upsert_historical_prices();
ALTER TABLE public.dnse_order_events ADD CONSTRAINT dnse_order_events_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.assets(ticker) ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX dnse_order_events_order_status_idx ON public.dnse_order_events (order_status);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_dnse_account_id_key UNIQUE (dnse_account_id);
ALTER TABLE public.dnse_order_events ADD CONSTRAINT dnse_order_events_account_no_fkey FOREIGN KEY (account_no) REFERENCES public.user_settings(dnse_account_id) ON UPDATE CASCADE ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
