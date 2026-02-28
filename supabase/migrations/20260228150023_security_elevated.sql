CREATE OR REPLACE FUNCTION "public"."process_dnse_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only process fully filled orders
  IF NEW.order_status = 'Filled' THEN
    PERFORM public.add_stock_event(
      NEW.side,
      NEW.symbol,
      NEW.average_price,
      NEW.fill_quantity,
      NEW.fee,
      NEW.tax
    );
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."rebuild_ledger"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    r record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;
    truncate table public.asset_positions cascade;

    -- Step 2: replay all transactions in chronological order
    for r in
        select id as tx_id, category, created_at
        from public.tx_entries
        where category in ('stock', 'cashflow', 'debt')
        order by created_at asc
    loop
        if r.category = 'stock' then
            perform public.process_tx_stock(r.tx_id);

        elsif r.category = 'cashflow' then
            perform public.process_tx_cashflow(r.tx_id);

        elsif r.category = 'debt' then
            perform public.process_tx_debt(r.tx_id);

        else
            raise notice 'Skipping unknown category % for tx_id %', r.category, r.tx_id;
        end if;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;
$$;

DROP TRIGGER IF EXISTS trg_process_tx_cashflow ON tx_cashflow;
DROP TRIGGER IF EXISTS trg_process_tx_debt ON tx_debt;
DROP TRIGGER IF EXISTS trg_process_tx_stock ON tx_stock;

drop function if exists trg_process_tx_cashflow_func();
CREATE OR REPLACE FUNCTION "public"."create_tx_cashflow_legs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.process_tx_cashflow(new.tx_id);
    return new;
end;
$$;

drop function if exists trg_process_tx_debt_func();
CREATE OR REPLACE FUNCTION "public"."create_tx_debt_legs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.process_tx_debt(new.tx_id);
    return new;
end;
$$;

drop function if exists trg_process_tx_stock_func();
CREATE OR REPLACE FUNCTION "public"."create_tx_stock_legs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.process_tx_stock(new.tx_id);
    return new;
end;
$$;


CREATE OR REPLACE TRIGGER "tx_legs_after_tx_cashflow" AFTER INSERT ON "public"."tx_cashflow" FOR EACH ROW EXECUTE FUNCTION "public"."create_tx_cashflow_legs"();
CREATE OR REPLACE TRIGGER "tx_legs_after_tx_debt" AFTER INSERT ON "public"."tx_debt" FOR EACH ROW EXECUTE FUNCTION "public"."create_tx_debt_legs"();
CREATE OR REPLACE TRIGGER "tx_legs_after_tx_stock" AFTER INSERT ON "public"."tx_stock" FOR EACH ROW EXECUTE FUNCTION "public"."create_tx_stock_legs"();