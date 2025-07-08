DROP FUNCTION IF EXISTS public.get_stock_holdings();

CREATE OR REPLACE FUNCTION public.get_latest_stock_price(p_security_id uuid)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT price
  INTO latest_price
  FROM public.daily_stock_prices
  WHERE security_id = p_security_id
  ORDER BY date DESC
  LIMIT 1;

  RETURN latest_price;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stock_holdings()
RETURNS TABLE(
    ticker text,
    name text,
    logo_url text,
    quantity numeric,
    cost_basis numeric,
    latest_price numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.ticker,
        s.name,
        'https://s3-symbol-logo.tradingview.com/' || s.logo_url || '--big.svg' AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        public.get_latest_stock_price(s.id) AS latest_price
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'stock' AND a.user_id = auth.uid()
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;