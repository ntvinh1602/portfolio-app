-- Add related_stocks text array column to news_articles
ALTER TABLE public.news_articles
  ADD COLUMN related_stocks text[] DEFAULT '{}';

-- Migrate existing ticker data from news_article_assets into the new column
UPDATE public.news_articles na
SET related_stocks = (
  SELECT array_agg(a.ticker)
  FROM public.news_article_assets naa
  JOIN public.assets a ON a.id = naa.asset_id
  WHERE naa.article_id = na.id
);

-- Add GIN index for efficient array queries
CREATE INDEX idx_news_articles_related_stocks
  ON public.news_articles USING gin (related_stocks);

-- Drop the deprecated join table and its dependencies
DROP INDEX IF EXISTS public.news_article_assets_asset_id_idx;
DROP TABLE IF EXISTS public.news_article_assets;
