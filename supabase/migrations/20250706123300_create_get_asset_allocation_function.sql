CREATE OR REPLACE FUNCTION "public"."get_asset_allocation"()
RETURNS json
LANGUAGE "plpgsql"
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object('type', asset_class, 'totalAmount', market_value)
  )
  INTO result
  FROM (
      SELECT
        s.asset_class,
        SUM(COALESCE(qty.total_quantity, 0) * COALESCE(s.last_updated_price, 0)) AS market_value
      FROM
        assets a
      JOIN securities s ON a.security_id = s.id
      LEFT JOIN
        (SELECT asset_id, SUM(quantity) AS total_quantity
         FROM transaction_legs
         JOIN transactions t ON transaction_legs.transaction_id = t.id
         WHERE t.user_id = auth.uid()
         GROUP BY asset_id) AS qty ON a.id = qty.asset_id
      WHERE a.user_id = auth.uid() AND s.asset_class NOT IN ('equity', 'liability')
      GROUP BY s.asset_class
  ) as market_totals
  WHERE market_value > 0;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT ALL ON FUNCTION "public"."get_asset_allocation"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_asset_allocation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_asset_allocation"() TO "service_role";