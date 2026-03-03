CREATE POLICY "Auth users can read aircrafts" ON "flight"."aircrafts" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Auth users can read airlines" ON "flight"."airlines" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Auth users can read airports" ON "flight"."airports" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Auth users can read flights" ON "flight"."aircrafts" FOR SELECT TO "authenticated" USING (true);