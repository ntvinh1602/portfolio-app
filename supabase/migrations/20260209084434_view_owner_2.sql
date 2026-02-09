CREATE OR REPLACE VIEW "public"."stock_annual_pnl" WITH ("security_invoker"='on') AS
 WITH "capital_legs" AS (
         SELECT "tl"."transaction_id",
            "tl"."amount" AS "capital_amount",
            "t"."transaction_date"
           FROM ("public"."transaction_legs" "tl"
             JOIN "public"."transactions" "t" ON (("t"."id" = "tl"."transaction_id")))
          WHERE ("tl"."asset_id" = 'e39728be-0a37-4608-b30d-dabd1a4017ab'::"uuid")
        ), "stock_legs" AS (
         SELECT "tl"."transaction_id",
            "tl"."asset_id" AS "stock_id"
           FROM ("public"."transaction_legs" "tl"
             JOIN "public"."assets" "a_1" ON (("a_1"."id" = "tl"."asset_id")))
          WHERE ("a_1"."asset_class" = 'stock'::"public"."asset_class")
        )
 SELECT (EXTRACT(year FROM "c"."transaction_date"))::integer AS "year",
    "a"."ticker",
    "a"."name",
    "a"."logo_url",
    (- "sum"("c"."capital_amount")) AS "total_pnl"
   FROM (("capital_legs" "c"
     JOIN "stock_legs" "s" ON (("s"."transaction_id" = "c"."transaction_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "s"."stock_id")))
  GROUP BY "a"."logo_url", "a"."name", "a"."ticker", (EXTRACT(year FROM "c"."transaction_date"));
