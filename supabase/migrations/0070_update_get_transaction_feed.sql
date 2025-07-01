DROP FUNCTION IF EXISTS "public"."get_transaction_feed"(integer, integer, date, date, text);

CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") 
RETURNS TABLE(
    "transaction_id" "uuid", 
    "transaction_date" "date", 
    "type" "text", 
    "description" "text", 
    "ticker" "text", 
    "name" "text", 
    "logo_url" "text", 
    "quantity" numeric, 
    "amount" numeric, 
    "currency_code" "text", 
    "net_sold" numeric
)
LANGUAGE "plpgsql"
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
        a.ticker,
        a.name,
        CASE
            WHEN a.logo_url IS NOT NULL THEN 'https://s3-symbol-logo.tradingview.com/' || a.logo_url || '--big.svg'
            ELSE NULL
        END,
        tl.quantity,
        tl.amount,
        tl.currency_code::text,
        CASE
            WHEN t.type = 'sell' THEN (
                SELECT td.price * ABS(tl.quantity) - td.fees - td.taxes
                FROM public.transaction_details td
                WHERE td.transaction_id = t.id
            )
            ELSE NULL
        END AS net_sold
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    WHERE
        t.user_id = auth.uid() AND
        a.asset_class NOT IN ('equity', 'liability') AND
        NOT (a.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell')) AND
        (start_date IS NULL OR t.transaction_date >= start_date) AND
        (end_date IS NULL OR t.transaction_date <= end_date) AND
        (asset_class_filter IS NULL OR a.asset_class::text = asset_class_filter)
    ORDER BY
        t.transaction_date DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;