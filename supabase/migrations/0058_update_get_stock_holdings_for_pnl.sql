DROP FUNCTION IF EXISTS public.get_stock_holdings();

CREATE OR REPLACE FUNCTION public.get_stock_holdings()
RETURNS TABLE(
    ticker text,
    name text,
    logo_url text,
    quantity numeric,
    cost_basis numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.ticker,
        a.name,
        'https://s3-symbol-logo.tradingview.com/' || a.logo_url || '--big.svg' AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis
    FROM
        public.assets a
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        a.asset_class = 'stock' AND a.user_id = auth.uid()
    GROUP BY
        a.id, a.ticker, a.name, a.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;