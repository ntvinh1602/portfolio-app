drop policy "Users can manage their own accounts"
on "public"."accounts";

create policy "Authenticated user can read their own accounts or demo accounts"
on "public"."accounts"
for select
to authenticated
using (demo_user_id() = user_id and is_registered_user() is false);

create policy "Registered users can manage their own accounts"
on "public"."accounts"
to authenticated
using ((select auth.uid()) = user_id and is_registered_user());