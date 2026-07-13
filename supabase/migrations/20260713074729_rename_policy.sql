DROP POLICY daily_snapshots_select_own ON public.daily_snapshots;
CREATE POLICY "Enable users to view their own data only" ON public.daily_snapshots FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
