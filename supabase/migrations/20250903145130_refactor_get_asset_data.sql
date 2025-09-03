CREATE OR REPLACE FUNCTION "public"."get_asset_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  assets_data jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(a)) INTO assets_data
  FROM public.assets a
  WHERE a.asset_class NOT IN ('equity', 'liability');
  RETURN jsonb_build_object('assets', assets_data);
END;
$$;