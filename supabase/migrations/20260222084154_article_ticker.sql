CREATE TABLE public.news_article_assets (
  article_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT news_article_assets_pkey 
    PRIMARY KEY (article_id, asset_id),

  CONSTRAINT news_article_assets_article_fkey
    FOREIGN KEY (article_id)
    REFERENCES public.news_articles (id)
    ON DELETE CASCADE,

  CONSTRAINT news_article_assets_asset_fkey
    FOREIGN KEY (asset_id)
    REFERENCES public.assets (id)
    ON DELETE CASCADE
) TABLESPACE pg_default;