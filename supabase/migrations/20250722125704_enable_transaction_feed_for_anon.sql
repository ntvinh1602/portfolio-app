drop function if exists "public"."get_transaction_feed"(integer, integer, "date", "date", "text");

CREATE OR REPLACE FUNCTION "public"."get_transaction_feed"("p_user_id" "uuid","page_size" integer, "page_number" integer, "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date", "asset_class_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" "uuid", "transaction_date" "date", "type" "text", "description" "text", "ticker" "text", "name" "text", "logo_url" "text", "quantity" numeric, "amount" numeric, "currency_code" "text", "net_sold" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_offset integer;
BEGIN
    -- Calculate the offset for pagination
    v_offset := (page_number - 1) * page_size;
    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.type::text,
        t.description,
        s.ticker,
        s.name,
        CASE
            WHEN s.logo_url IS NOT NULL THEN 'https://s3-symbol-logo.tradingview.com/' || s.logo_url || '--big.svg'
            ELSE NULL
        END,
        tl.quantity,
        tl.amount,
        tl.currency_code::text,
        CASE
            WHEN t.type = 'sell' THEN (
                SELECT td.price * ABS(tl.quantity) - td.fees - td.taxes
                FROM public.transaction_details td
                WHERE td.transaction_id = t.id
            )
            ELSE NULL
        END AS net_sold
    FROM
        public.transactions t
    JOIN
        public.transaction_legs tl ON t.id = tl.transaction_id
    JOIN
        public.assets a ON tl.asset_id = a.id
    JOIN
        public.securities s ON a.security_id = s.id
    WHERE
        t.user_id = p_user_id AND
        s.asset_class NOT IN ('equity', 'liability') AND
        NOT (s.asset_class = 'cash' AND (t.type = 'buy' OR t.type = 'sell')) AND
        (start_date IS NULL OR t.transaction_date >= start_date) AND
        (end_date IS NULL OR t.transaction_date <= end_date) AND
        (asset_class_filter IS NULL OR s.asset_class::text = asset_class_filter)
    ORDER BY
        t.transaction_date DESC
    LIMIT page_size
    OFFSET v_offset;
END;
$$;

alter policy "Users can manage their own transactions"
on "public"."transactions"
to authenticated
using (( SELECT auth.uid() ) = user_id and auth.email() is not null);

create policy "Guests can read demo user transactions"
on "public"."transactions"
for select
to anon
using (user_id = demo_user_id());

alter policy "Users can manage their own transaction_legs"
on "public"."transaction_legs"
to authenticated
using (( SELECT auth.uid()) = (
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_legs.transaction_id)
) and auth.email() is not null);

create policy "Guests can read demo user transaction_legs"
on "public"."transaction_legs"
for select
to anon
using ((
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_legs.transaction_id)) = demo_user_id());

alter policy "Users can manage details for their own transactions"
on "public"."transaction_details"
to authenticated
using (( SELECT auth.uid()) = (
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_details.transaction_id)
) and auth.email() is not null);

create policy "Guests can read details of demo user transactions"
on "public"."transaction_details"
for select
to anon
using ((
  SELECT transactions.user_id
  FROM transactions
  WHERE (transactions.id = transaction_details.transaction_id)) = demo_user_id());