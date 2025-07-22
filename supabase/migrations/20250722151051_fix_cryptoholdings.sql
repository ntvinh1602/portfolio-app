drop function if exists "public"."get_crypto_holdings"();

CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"("p_user_id" "uuid") RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric, "latest_usd_rate" numeric)
    LANGUAGE "plpgsql"
    security DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.ticker,
        s.name,
        'https://s3-symbol-logo.tradingview.com/' || s.logo_url || '--big.svg' AS logo_url,
        SUM(tl.quantity) AS quantity,
        SUM(tl.amount) AS cost_basis,
        public.get_latest_crypto_price(s.id) AS latest_price,
        public.get_latest_exchange_rate('USD') AS latest_usd_rate
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'crypto' AND a.user_id = p_user_id
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;