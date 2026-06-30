drop view if exists "public"."tx_summary";

alter type "public"."tx_category" rename to "tx_category__old_version_to_be_dropped";

create type "public"."tx_category" as enum ('stock', 'cashflow', 'borrow', 'repay');

alter table "public"."tx_entries" alter column category type "public"."tx_category" using category::text::"public"."tx_category";

drop type "public"."tx_category__old_version_to_be_dropped";

create or replace view "public"."tx_summary" as  SELECT t.id,
    t.created_at,
    t.category,
        CASE
            WHEN (t.category = 'stock'::public.tx_category) THEN (s.operation)::text
            WHEN (t.category = 'cashflow'::public.tx_category) THEN (cf.operation)::text
            ELSE (t.category)::text
        END AS operation,
        CASE
            WHEN (t.category = 'stock'::public.tx_category) THEN s.net_proceed
            WHEN (t.category = 'cashflow'::public.tx_category) THEN cf.net_proceed
            WHEN (t.category = 'borrow'::public.tx_category) THEN b.principal
            ELSE r.net_proceed
        END AS value,
    t.memo
   FROM ((((public.tx_entries t
     LEFT JOIN public.tx_stock s ON ((t.id = s.tx_id)))
     LEFT JOIN public.tx_cashflow cf ON ((t.id = cf.tx_id)))
     LEFT JOIN public.tx_borrow b ON ((t.id = b.tx_id)))
     LEFT JOIN public.tx_repay r ON ((t.id = r.tx_id)))
  WHERE (t.user_id = auth.uid());



