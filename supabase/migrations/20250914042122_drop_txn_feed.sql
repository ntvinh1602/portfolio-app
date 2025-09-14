drop function if exists "public"."get_transaction_feed"(integer, integer, "date", "date", "text");

CREATE OR REPLACE FUNCTION public.get_transactions(
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    id uuid,
    transaction_date date,
    type text,
    description text
)
LANGUAGE sql
AS $$
  SELECT
    t.id,
    t.transaction_date,
    t.type::text,
    t.description
  FROM transactions AS t
  WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.description NOT IN ('Income tax', 'Transaction fee')
  ORDER BY t.transaction_date DESC, t.created_at DESC
  LIMIT 200;
$$;

drop function if exists "public"."get_asset_data"();

CREATE OR REPLACE FUNCTION public.get_assets()
RETURNS TABLE (
    id uuid,
    asset_class text,
    currency_code text,
    current_quantity numeric,
    logo_url text,
    name text,
    ticker text
)
LANGUAGE sql
AS $$
  SELECT
    a.id,
    a.asset_class,
    a.currency_code,
    a.current_quantity,
    a.logo_url,
    a.name,
    a.ticker
  FROM public.assets a
  WHERE a.asset_class NOT IN ('equity', 'liability');
$$;

