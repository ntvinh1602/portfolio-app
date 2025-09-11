CREATE OR REPLACE FUNCTION "public"."get_transactions"(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    type TEXT,
    description TEXT
)
LANGUAGE plpgsql
SET "search_path" TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.type::TEXT, -- Explicitly cast to TEXT
        t.description
    FROM
        transactions AS t
    WHERE
        t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.description NOT IN ('Income tax', 'Transaction fee')
    ORDER BY
        t.transaction_date DESC,
        t.created_at DESC
    LIMIT 200;
END;
$$;