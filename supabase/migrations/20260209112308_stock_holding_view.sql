CREATE OR REPLACE VIEW public.stock_holdings WITH (security_invoker='on') AS
WITH latest_data AS (
  SELECT 
    a.id AS asset_id, 
    public.get_security_price(a.id) AS price
  FROM public.assets a
  WHERE a.asset_class = 'stock'
)
SELECT
  a.ticker,
  a.name,
  a.logo_url,
  SUM(tl.quantity) AS quantity,
  SUM(tl.amount) AS cost_basis,
  ld.price,
  SUM(tl.quantity) * ld.price AS market_value
FROM public.assets a
JOIN public.transaction_legs tl ON a.id = tl.asset_id
JOIN latest_data ld ON ld.asset_id = a.id
WHERE a.asset_class = 'stock'
GROUP BY a.id, a.ticker, a.name, a.logo_url, ld.price
HAVING SUM(tl.quantity) > 0;
