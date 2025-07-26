drop policy "Authenticated user can read their own accounts or demo accounts"
on "public"."accounts";
drop policy "Registered users can manage their own accounts"
on "public"."accounts";

CREATE POLICY "Authenticated users can access own accounts or demo accounts" 
ON "public"."accounts"
TO authenticated 
USING (
  (demo_user_id() = user_id AND is_registered_user() IS FALSE) OR
  ((select auth.uid()) = user_id AND is_registered_user())
);