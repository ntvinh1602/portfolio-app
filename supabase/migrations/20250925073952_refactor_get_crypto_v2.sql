drop function if exists "public"."get_crypto_holdings"();

CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "currency_code" "text","quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT
      a.id AS asset_id,
      public.get_latest_crypto_price(a.id) AS latest_price,
      public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM public.assets a
    WHERE a.asset_class = 'crypto'
  )
  SELECT
    a.ticker,
    a.name,
    a.logo_url,
    a.currency_code::text,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.latest_price,
    ld.latest_usd_rate,
    SUM(tl.quantity) * ld.latest_price * ld.latest_usd_rate AS total_amount
  FROM public.assets a
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.asset_id = a.id
  WHERE a.asset_class = 'crypto'
  GROUP BY a.id, a.ticker, a.name, a.logo_url, a.currency_code, ld.latest_price, ld.latest_usd_rate
  HAVING SUM(tl.quantity) > 0;
END;
$$;