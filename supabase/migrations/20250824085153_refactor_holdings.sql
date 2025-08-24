DROP FUNCTION IF EXISTS "public"."get_stock_holdings"("uuid");

CREATE OR REPLACE FUNCTION "public"."get_stock_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_prices AS (
    SELECT 
      s.id AS security_id, 
      public.get_latest_stock_price(s.id) AS latest_price
    FROM public.securities s
  )
  SELECT
    s.ticker,
    s.name,
    s.logo_url,
    SUM(tl.quantity) AS quantity,
    SUM(tl.amount) AS cost_basis,
    lp.latest_price,
    SUM(tl.quantity) * lp.latest_price AS total_amount
  FROM public.assets a
  JOIN public.securities s ON a.security_id = s.id
  JOIN public.transaction_legs tl ON a.id = tl.asset_id
  JOIN latest_prices lp ON lp.security_id = s.id
  WHERE s.asset_class = 'stock' AND a.user_id = p_user_id
  GROUP BY a.id, s.id, s.ticker, s.name, s.logo_url, lp.latest_price
  HAVING SUM(tl.quantity) > 0;
END;
$$;

