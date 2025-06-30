-- Drop the existing function to redefine it with new parameters for pagination
DROP FUNCTION IF EXISTS public.get_transaction_feed();

-- Recreate the function with pagination parameters
CREATE OR REPLACE FUNCTION public.get_transaction_feed(
    page_size integer,
    page_number integer
)
RETURNS TABLE(
    transaction_id uuid,
    transaction_date date,
    type text,
    description text,
    ticker text,
    name text,
    logo_url text,
    quantity numeric,
    amount numeric,
    currency_code text
)
LANGUAGE plpgsql
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
        tl.currency_code::text
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    WHERE
        t.user_id = auth.uid() AND
        a.asset_class NOT IN ('equity', 'liability') AND
        NOT (a.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell'))
    ORDER BY
        t.transaction_date DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;