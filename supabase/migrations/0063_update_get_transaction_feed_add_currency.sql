DROP FUNCTION IF EXISTS public.get_transaction_feed();

CREATE OR REPLACE FUNCTION public.get_transaction_feed()
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
BEGIN
    RETURN QUERY
    SELECT
        t.id as transaction_id,
        t.transaction_date,
        t.type::text,
        t.description,
        a.ticker,
        a.name,
        CASE
            WHEN a.logo_url IS NOT NULL THEN 'https://s3-symbol-logo.tradingview.com/' || a.logo_url || '--big.svg'
            ELSE NULL
        END AS logo_url,
        tl.quantity,
        tl.amount,
        tl.currency_code
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
    LIMIT 20;
END;
$$;