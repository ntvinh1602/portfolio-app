create or replace function demo_user_id()
returns uuid
language sql
    SET "search_path" TO 'public'
as $$
  select '519fcecb-2177-4978-a8d1-086a53b7ac23'::uuid
$$;

create or replace function get_active_debts(p_user_id uuid)
returns setof debts
language sql

    SET "search_path" TO 'public'
as $$
  select *
  from debts
  where status = 'active' and user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION "public"."upsert_daily_crypto_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get the security_id from the securities table for crypto assets
  SELECT id INTO v_security_id FROM securities WHERE ticker = p_ticker AND asset_class = 'crypto';
  -- If the security exists, insert or update the price
  IF v_security_id IS NOT NULL THEN
    INSERT INTO daily_crypto_prices (security_id, price, date)
    VALUES (v_security_id, p_price, CURRENT_DATE)
    ON CONFLICT (security_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."upsert_daily_stock_price"("p_ticker" "text", "p_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get the security_id from the securities table for stock assets
  SELECT id INTO v_security_id FROM securities WHERE ticker = p_ticker AND asset_class = 'stock';
  -- If the security exists, insert or update the price
  IF v_security_id IS NOT NULL THEN
    INSERT INTO daily_stock_prices (security_id, price, date)
    VALUES (v_security_id, p_price, CURRENT_DATE)
    ON CONFLICT (security_id, date) 
    DO UPDATE SET price = p_price;
  END IF;
END;
$$;