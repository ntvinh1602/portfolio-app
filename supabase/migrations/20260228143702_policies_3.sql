DROP POLICY "Access for authenticated users" ON news_article_assets;

create policy "Auth users can read news_article_assets"
on news_article_assets for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON news_articles;

create policy "Auth users can read news_articles"
on news_articles for select
to authenticated
using ( true );

DROP POLICY "Access for authenticated users" ON refresh_queue;
