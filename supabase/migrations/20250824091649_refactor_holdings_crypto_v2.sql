DROP FUNCTION IF EXISTS "public"."get_crypto_holdings"("uuid");

CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT
      s.id AS security_id,
      public.get_latest_crypto_price(s.id) AS latest_price,
      public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM public.securities s
    WHERE s.asset_class = 'crypto'
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url AS logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    ld.latest_price,
    ld.latest_usd_rate,
    SUM(tl.quantity) * ld.latest_price * ld.latest_usd_rate AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_data ld ON ld.security_id = s.id
  WHERE s.asset_class = 'crypto' AND a.user_id = p_user_id
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, ld.latest_price, ld.latest_usd_rate
  HAVING SUM(tl.quantity) > 0;
END;
$$; 