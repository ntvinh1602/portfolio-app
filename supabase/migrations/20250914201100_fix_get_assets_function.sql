drop function if exists public.get_assets();

CREATE OR REPLACE FUNCTION public.get_assets()
RETURNS TABLE (
    id uuid,
    asset_class text,
    currency_code text,
    current_quantity numeric,
    logo_url text,
    name text,
    ticker text,
    is_active boolean
)
LANGUAGE sql
SET "search_path" TO 'public'
AS $$
  SELECT
    a.id,
    a.asset_class,
    a.currency_code,
    a.current_quantity,
    a.logo_url,
    a.name,
    a.ticker,
    a.is_active
  FROM public.assets a
  WHERE a.asset_class NOT IN ('equity', 'liability');
$$;