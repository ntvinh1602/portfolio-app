CREATE OR REPLACE VIEW public.crypto_holdings WITH (security_invoker='on') AS
WITH latest_data AS (
  SELECT
    a.id AS asset_id,
    public.get_security_price(a.id) AS price,
    public.get_fx_rate(a.currency_code) AS fx_rate
  FROM public.assets a
  WHERE a.asset_class = 'crypto'
)
SELECT
  a.ticker,
  a.name,
  a.logo_url,
  a.currency_code,
  SUM(tl.quantity) AS quantity,
  SUM(tl.amount) AS cost_basis,
  ld.price,
  ld.fx_rate,
  SUM(tl.quantity) * ld.price * ld.fx_rate AS market_value
FROM public.assets a
JOIN public.transaction_legs tl ON a.id = tl.asset_id
JOIN latest_data ld ON ld.asset_id = a.id
WHERE a.asset_class = 'crypto'
GROUP BY a.id, a.ticker, a.name, a.logo_url, a.currency_code, ld.price, ld.fx_rate
HAVING SUM(tl.quantity) > 0;