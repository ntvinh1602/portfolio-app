drop function if exists "public"."get_asset_account_data"("uuid");

CREATE OR REPLACE FUNCTION "public"."get_asset_data"("p_user_id" "uuid") RETURNS "jsonb"
  LANGUAGE "plpgsql"
  SET "search_path" TO 'public'
  AS $$
DECLARE
  assets_data jsonb;
BEGIN
  -- Fetch assets data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'user_id', a.user_id,
      'security_id', a.security_id,
      'securities', to_jsonb(s)
    )
  ) INTO assets_data
  FROM assets a
  JOIN securities s ON a.security_id = s.id
  WHERE a.user_id = p_user_id AND s.asset_class NOT IN ('equity', 'liability');
  RETURN jsonb_build_object('assets', assets_data);
END;
$$;