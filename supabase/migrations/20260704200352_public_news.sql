DROP POLICY "Auth users can read news_articles" ON public.news_articles;
CREATE POLICY "Enable read access for all users" ON public.news_articles FOR SELECT USING (true);
CREATE OR REPLACE TRIGGER after_new_tx_legs AFTER INSERT ON public.tx_legs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_snapshots();
