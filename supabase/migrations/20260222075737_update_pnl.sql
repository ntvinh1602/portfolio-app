CREATE OR REPLACE VIEW "public"."balance_sheet" WITH ("security_invoker"='on') AS
 WITH "stock" AS (
         SELECT "a"."ticker",
            ("sum"("tl"."debit") - "sum"("tl"."credit")) AS "cost_basis",
            "sum"((("tl"."quantity" * COALESCE("sp"."price", (1)::numeric)) * COALESCE("er"."rate", (1)::numeric))) AS "market_value"
           FROM ((("public"."assets" "a"
             JOIN "public"."tx_legs" "tl" ON (("a"."id" = "tl"."asset_id")))
             LEFT JOIN LATERAL ( SELECT "daily_security_prices"."price"
                   FROM "public"."daily_security_prices"
                  WHERE ("daily_security_prices"."asset_id" = "a"."id")
                  ORDER BY "daily_security_prices"."date" DESC
                 LIMIT 1) "sp" ON (true))
             LEFT JOIN LATERAL ( SELECT "daily_exchange_rates"."rate"
                   FROM "public"."daily_exchange_rates"
                  WHERE ("daily_exchange_rates"."currency_code" = "a"."currency_code")
                  ORDER BY "daily_exchange_rates"."date" DESC
                 LIMIT 1) "er" ON (true))
          WHERE ("a"."asset_class" = ANY (ARRAY['stock'::"public"."asset_class", 'fund'::"public"."asset_class"]))
          GROUP BY "a"."ticker"
        ), "debt_interest" AS (
         SELECT COALESCE("sum"(("d"."principal" * ("power"(((1)::numeric + (("d"."rate" / (100)::numeric) / (365)::numeric)), EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - "e"."created_at"))) - (1)::numeric))), (0)::numeric) AS "coalesce"
           FROM ("public"."tx_debt" "d"
             JOIN "public"."tx_entries" "e" ON (("e"."id" = "d"."tx_id")))
          WHERE (("d"."operation" = 'borrow'::"text") AND (NOT (EXISTS ( SELECT 1
                   FROM "public"."tx_debt" "x"
                  WHERE ("x"."repay_tx" = "d"."tx_id")))))
        ), "pnl" AS (
         SELECT (("sum"("s_1"."market_value") - "sum"("s_1"."cost_basis")) - ( SELECT "debt_interest"."coalesce"
                   FROM "debt_interest")) AS "?column?"
           FROM "stock" "s_1"
        ), "margin" AS (
         SELECT GREATEST((- "sum"("tl"."quantity")), (0)::numeric) AS "greatest"
           FROM ("public"."tx_legs" "tl"
             JOIN "public"."assets" "a" ON (("tl"."asset_id" = "a"."id")))
          WHERE ("a"."ticker" = 'FX.VND'::"text")
        ), "asset_quantity" AS (
         SELECT "a"."ticker",
            "a"."name",
            "a"."asset_class",
                CASE
                    WHEN ("a"."ticker" = 'INTERESTS'::"text") THEN ( SELECT "debt_interest"."coalesce"
                       FROM "debt_interest")
                    WHEN ("a"."ticker" = 'UNREALIZED'::"text") THEN ( SELECT "pnl"."?column?"
                       FROM "pnl")
                    WHEN ("a"."ticker" = 'MARGIN'::"text") THEN ( SELECT "margin"."greatest"
                       FROM "margin")
                    ELSE GREATEST("sum"("tl"."quantity"), (0)::numeric)
                END AS "quantity"
           FROM ("public"."assets" "a"
             LEFT JOIN "public"."tx_legs" "tl" ON (("tl"."asset_id" = "a"."id")))
          WHERE ("a"."asset_class" <> 'index'::"public"."asset_class")
          GROUP BY "a"."id", "a"."ticker", "a"."asset_class"
        )
 SELECT "aq"."ticker",
    "aq"."name",
    "aq"."asset_class",
    "aq"."quantity",
        CASE
            WHEN ("aq"."asset_class" = ANY (ARRAY['stock'::"public"."asset_class", 'fund'::"public"."asset_class"])) THEN "s"."market_value"
            ELSE "aq"."quantity"
        END AS "total_value"
   FROM ("asset_quantity" "aq"
     LEFT JOIN "stock" "s" ON (("aq"."ticker" = "s"."ticker")))
  WHERE (("aq"."quantity" > (0)::numeric) OR ("aq"."asset_class" <> 'stock'::"public"."asset_class"))
  ORDER BY "aq"."asset_class";