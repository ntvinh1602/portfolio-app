drop function if exists "public"."get_transaction_feed"("uuid", integer, integer, "date", "date", "text");

CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid", "page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" "uuid", "transaction_date" "date", "type" "text", "description" "text", "ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "amount" numeric, "currency_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_offset integer;
BEGIN
    -- Calculate the offset for pagination
    v_offset := (page_number - 1) * page_size;
    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.type::text,
        t.description,
        s.ticker,
        s.name,
        CASE
            WHEN s.logo_url IS NOT NULL THEN s.logo_url
            ELSE NULL
        END,
        tl.quantity,
        tl.amount,
        tl.currency_code::text
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    JOIN
        public.securities s ON a.security_id = s.id
    WHERE
        t.user_id = p_user_id AND
        s.asset_class NOT IN ('equity', 'liability') AND
        NOT (s.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell')) AND
        (start_date IS NULL OR t.transaction_date >= start_date) AND
        (end_date IS NULL OR t.transaction_date <= end_date) AND
        (asset_class_filter IS NULL OR s.asset_class::text = asset_class_filter)
    ORDER BY
        t.created_at DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;