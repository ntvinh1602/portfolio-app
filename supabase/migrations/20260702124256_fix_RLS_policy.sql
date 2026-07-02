
DROP POLICY "Auth users can read historical_fxrate" ON public.historical_fxrate;
DROP POLICY "Auth users can read historical_prices" ON public.historical_prices;
CREATE POLICY "Enable insert for authenticated users only" ON public.historical_fxrate FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON public.historical_fxrate FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users only" ON public.historical_fxrate FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.historical_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON public.historical_prices FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users only" ON public.historical_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);