alter policy "Users can manage their own transaction_legs"
on "public"."transaction_legs"
to authenticated
using (( SELECT auth.uid()) = (
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_legs.transaction_id)
) and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);

alter policy "Users can manage details for their own transactions"
on "public"."transaction_details"
to authenticated
using (( SELECT auth.uid()) = (
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_details.transaction_id)
) and 
  (select (auth.jwt()->>'is_anonymous')::boolean) is false);