CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);
    RETURN v_balance;
END;
$$;