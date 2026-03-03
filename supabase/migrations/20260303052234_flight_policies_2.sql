
drop POLICY "Auth users can read flights" ON "flight"."aircrafts";
CREATE POLICY "Auth users can read flights" ON "flight"."flights" FOR SELECT TO "authenticated" USING (true);