CREATE TABLE IF NOT EXISTS "public"."daily_crypto_prices" (
    "security_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" numeric NOT NULL,
    CONSTRAINT "daily_crypto_prices_pkey" PRIMARY KEY ("security_id", "date"),
    CONSTRAINT "daily_crypto_prices_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "public"."securities"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."daily_crypto_prices" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX daily_crypto_prices_security_id_date_idx ON public.daily_crypto_prices USING btree (security_id, date);

CREATE POLICY "Enable read access for all users" ON "public"."daily_crypto_prices" FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION "public"."get_latest_crypto_price"("p_security_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  latest_price NUMERIC;
BEGIN
  SELECT price
  INTO latest_price
  FROM public.daily_crypto_prices
  WHERE security_id = p_security_id
  ORDER BY date DESC
  LIMIT 1;
  RETURN latest_price;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_crypto_holdings"() RETURNS TABLE("ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "cost_basis" numeric, "latest_price" numeric)
    LANGUAGE "plpgsql"
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
        public.get_latest_crypto_price(s.id) AS latest_price
    FROM
        public.assets a
    JOIN
        public.securities s ON a.security_id = s.id
    JOIN
        public.transaction_legs tl ON a.id = tl.asset_id
    WHERE
        s.asset_class = 'crypto' AND a.user_id = auth.uid()
    GROUP BY
        a.id, s.id, s.ticker, s.name, s.logo_url
    HAVING
        SUM(tl.quantity) > 0;
END;
$$;