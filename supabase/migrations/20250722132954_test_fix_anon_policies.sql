alter policy "Users can manage their own transactions"
on "public"."transactions"
to authenticated
using (( SELECT auth.uid() ) = user_id and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);