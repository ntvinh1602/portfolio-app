drop view if exists dashboard_data;
drop view if exists monthly_snapshots;
drop view if exists yearly_snapshots;

drop MATERIALIZED VIEW daily_snapshots;


CREATE MATERIALIZED VIEW "public"."daily_snapshots" AS
 WITH "dates" AS (
         SELECT ("generate_series"((GREATEST('2021-11-09'::"date", COALESCE(( SELECT ("min"("tx_entries"."created_at"))::"date" AS "min"
                   FROM "public"."tx_entries"), '2021-11-09'::"date")))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::"date" AS "snapshot_date"
        ), "business_days" AS (
         SELECT "dates"."snapshot_date"
           FROM "dates"
          WHERE (EXTRACT(isodow FROM "dates"."snapshot_date") <> ALL (ARRAY[(6)::numeric, (7)::numeric]))
        ), "positions" AS (
         SELECT "d"."snapshot_date",
            "tl"."asset_id",
            "a"."currency_code",
            "sum"("tl"."quantity") AS "quantity"
           FROM ((("business_days" "d"
             JOIN "public"."tx_legs" "tl" ON (("tl"."tx_id" IN ( SELECT "e2"."id"
                   FROM "public"."tx_entries" "e2"
                  WHERE (("e2"."created_at")::"date" <= "d"."snapshot_date")))))
             JOIN "public"."tx_entries" "e_ref" ON (("e_ref"."id" = "tl"."tx_id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
          WHERE ("a"."asset_class" <> ALL (ARRAY['equity'::"public"."asset_class", 'liability'::"public"."asset_class"]))
          GROUP BY "d"."snapshot_date", "tl"."asset_id", "a"."currency_code"
        ), "asset_prices" AS (
         SELECT "p"."snapshot_date",
            "p"."asset_id",
            "p"."price"
           FROM ( SELECT "pos"."snapshot_date",
                    "pos"."asset_id",
                    ( SELECT "dsp"."price"
                           FROM "public"."daily_security_prices" "dsp"
                          WHERE (("dsp"."asset_id" = "pos"."asset_id") AND ("dsp"."date" <= "pos"."snapshot_date"))
                          ORDER BY "dsp"."date" DESC
                         LIMIT 1) AS "price"
                   FROM "positions" "pos") "p"
        ), "asset_fx" AS (
         SELECT "pos"."snapshot_date",
            "pos"."currency_code",
            ( SELECT "der"."rate"
                   FROM "public"."daily_exchange_rates" "der"
                  WHERE (("der"."currency_code" = "pos"."currency_code") AND ("der"."date" <= "pos"."snapshot_date"))
                  ORDER BY "der"."date" DESC
                 LIMIT 1) AS "rate"
           FROM ( SELECT DISTINCT "positions"."snapshot_date",
                    "positions"."currency_code"
                   FROM "positions") "pos"
        ), "total_assets_per_day" AS (
         SELECT "pos"."snapshot_date",
            COALESCE("sum"((("pos"."quantity" * COALESCE("ap"."price", (1)::numeric)) * COALESCE("af"."rate", (1)::numeric))), (0)::numeric) AS "total_assets"
           FROM (("positions" "pos"
             LEFT JOIN "asset_prices" "ap" ON ((("ap"."snapshot_date" = "pos"."snapshot_date") AND ("ap"."asset_id" = "pos"."asset_id"))))
             LEFT JOIN "asset_fx" "af" ON ((("af"."snapshot_date" = "pos"."snapshot_date") AND ("af"."currency_code" = "pos"."currency_code"))))
          GROUP BY "pos"."snapshot_date"
        ), "debt_events" AS (
         SELECT "b"."tx_id" AS "borrow_tx_id",
            "b"."principal",
            "b"."rate",
            ("e_b"."created_at")::"date" AS "borrow_date",
            ("e_r"."created_at")::"date" AS "repay_date"
           FROM ((("public"."tx_debt" "b"
             JOIN "public"."tx_entries" "e_b" ON (("e_b"."id" = "b"."tx_id")))
             LEFT JOIN "public"."tx_debt" "r" ON ((("r"."repay_tx" = "b"."tx_id") AND ("r"."operation" = 'repay'::"text"))))
             LEFT JOIN "public"."tx_entries" "e_r" ON (("e_r"."id" = "r"."tx_id")))
          WHERE ("b"."operation" = 'borrow'::"text")
        ), "debt_balances_by_day" AS (
         SELECT "d"."snapshot_date",
            "de"."borrow_tx_id",
            "de"."principal",
            "de"."rate",
            "de"."borrow_date",
            "de"."repay_date",
                CASE
                    WHEN (("de"."repay_date" IS NOT NULL) AND ("de"."repay_date" <= "d"."snapshot_date")) THEN (0)::numeric
                    ELSE ("de"."principal" * "power"(((1)::numeric + (("de"."rate" / 100.0) / 365.0)), (GREATEST(("d"."snapshot_date" - "de"."borrow_date"), 0))::numeric))
                END AS "balance_at_date"
           FROM ("debt_events" "de"
             CROSS JOIN "business_days" "d")
          WHERE ("de"."borrow_date" <= "d"."snapshot_date")
        ), "total_liabilities_per_day" AS (
         SELECT "debt_balances_by_day"."snapshot_date",
            COALESCE("sum"("debt_balances_by_day"."balance_at_date"), (0)::numeric) AS "total_liabilities"
           FROM "debt_balances_by_day"
          GROUP BY "debt_balances_by_day"."snapshot_date"
        ), "net_cashflow_per_day" AS (
         SELECT ("e"."created_at")::"date" AS "snapshot_date",
            COALESCE(("sum"("tl"."credit") - "sum"("tl"."debit")), (0)::numeric) AS "net_cashflow"
           FROM ((("public"."tx_entries" "e"
             JOIN "public"."tx_legs" "tl" ON (("tl"."tx_id" = "e"."id")))
             JOIN "public"."assets" "a" ON (("a"."id" = "tl"."asset_id")))
             JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "e"."id")))
          WHERE (("cf"."operation" = ANY (ARRAY['deposit'::"public"."cashflow_ops", 'withdraw'::"public"."cashflow_ops"])) AND ("a"."asset_class" = 'equity'::"public"."asset_class"))
          GROUP BY (("e"."created_at")::"date")
        ), "base" AS (
         SELECT "d"."snapshot_date",
            COALESCE("tad"."total_assets", (0)::numeric) AS "total_assets",
            COALESCE("tld"."total_liabilities", (0)::numeric) AS "total_liabilities",
            COALESCE("nc"."net_cashflow", (0)::numeric) AS "net_cashflow",
            (COALESCE("tad"."total_assets", (0)::numeric) - COALESCE("tld"."total_liabilities", (0)::numeric)) AS "net_equity"
           FROM ((("business_days" "d"
             LEFT JOIN "total_assets_per_day" "tad" ON (("tad"."snapshot_date" = "d"."snapshot_date")))
             LEFT JOIN "total_liabilities_per_day" "tld" ON (("tld"."snapshot_date" = "d"."snapshot_date")))
             LEFT JOIN "net_cashflow_per_day" "nc" ON (("nc"."snapshot_date" = "d"."snapshot_date")))
        ), "with_returns" AS (
         SELECT "b"."snapshot_date",
            "b"."total_assets",
            "b"."total_liabilities",
            "b"."net_equity",
            "b"."net_cashflow",
            COALESCE("sum"("b"."net_cashflow") OVER (ORDER BY "b"."snapshot_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::numeric) AS "cumulative_cashflow",
                CASE
                    WHEN ("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date") IS NULL) THEN (0)::numeric
                    WHEN ("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date") = (0)::numeric) THEN (0)::numeric
                    ELSE ((("b"."net_equity" - "b"."net_cashflow") - "lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date")) / NULLIF("lag"("b"."net_equity") OVER (ORDER BY "b"."snapshot_date"), (0)::numeric))
                END AS "daily_return"
           FROM "base" "b"
        ), "with_index" AS (
         SELECT "with_returns"."snapshot_date",
            "with_returns"."total_assets",
            "with_returns"."total_liabilities",
            "with_returns"."net_equity",
            "with_returns"."net_cashflow",
            "with_returns"."cumulative_cashflow",
            "with_returns"."daily_return",
            COALESCE(((1)::numeric + "with_returns"."daily_return"), (1)::numeric) AS "factor",
            (("exp"("sum"("ln"(GREATEST("abs"(COALESCE(((1)::numeric + "with_returns"."daily_return"), (1)::numeric)), 0.000000000001))) OVER (ORDER BY "with_returns"."snapshot_date")) * (100)::numeric) * (
                CASE
                    WHEN (("count"(*) FILTER (WHERE (((1)::numeric + "with_returns"."daily_return") < (0)::numeric)) OVER (ORDER BY "with_returns"."snapshot_date") % (2)::bigint) = 1) THEN '-1'::integer
                    ELSE 1
                END)::numeric) AS "equity_index"
           FROM "with_returns"
        )
 SELECT "snapshot_date",
    "total_assets",
    "total_liabilities",
    "net_equity",
    "net_cashflow",
    "cumulative_cashflow",
    "equity_index"
   FROM "with_index"
  ORDER BY "snapshot_date" DESC;
CREATE unique INDEX ON "public"."daily_snapshots" USING btree ("snapshot_date");

CREATE OR REPLACE VIEW "public"."monthly_snapshots" WITH ("security_invoker"='on') AS
 WITH "month_ranges" AS (
         SELECT ("date_trunc"('month'::"text", "d"."d"))::"date" AS "month_start",
            LEAST((("date_trunc"('month'::"text", "d"."d") + '1 mon -1 days'::interval))::"date", CURRENT_DATE) AS "month_end"
           FROM "generate_series"('2021-11-01 00:00:00+00'::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval) "d"("d")
        ), "monthly_transactions" AS (
         SELECT ("date_trunc"('month'::"text", "t"."created_at"))::"date" AS "month",
            ("sum"("s"."fee") + "sum"("cf"."net_proceed") FILTER (WHERE ("t"."memo" ~~* '%fee%'::"text"))) AS "total_fees",
            "sum"("s"."tax") AS "total_taxes",
            "sum"("d"."interest") AS "loan_interest",
            "sum"("cf"."net_proceed") FILTER (WHERE ("t"."memo" ~~* '%interest%'::"text")) AS "margin_interest"
           FROM ((("public"."tx_entries" "t"
             LEFT JOIN "public"."tx_debt" "d" ON (("d"."tx_id" = "t"."id")))
             LEFT JOIN "public"."tx_stock" "s" ON (("s"."tx_id" = "t"."id")))
             LEFT JOIN "public"."tx_cashflow" "cf" ON (("cf"."tx_id" = "t"."id")))
          GROUP BY (("date_trunc"('month'::"text", "t"."created_at"))::"date")
        ), "monthly_pnl" AS (
         SELECT "m_1"."month_start",
            "m_1"."month_end",
            "start_s"."net_equity" AS "start_equity",
            "end_s"."net_equity" AS "end_equity",
            COALESCE("sum"("ds"."net_cashflow"), (0)::numeric) AS "cash_flow",
            ((COALESCE("end_s"."net_equity", (0)::numeric) - COALESCE("start_s"."net_equity", (0)::numeric)) - COALESCE("sum"("ds"."net_cashflow"), (0)::numeric)) AS "pnl"
           FROM ((("month_ranges" "m_1"
             LEFT JOIN "public"."daily_snapshots" "ds" ON ((("ds"."snapshot_date" >= "m_1"."month_start") AND ("ds"."snapshot_date" <= "m_1"."month_end"))))
             LEFT JOIN LATERAL ( SELECT "s"."net_equity"
                   FROM "public"."daily_snapshots" "s"
                  WHERE ("s"."snapshot_date" < "m_1"."month_start")
                  ORDER BY "s"."snapshot_date" DESC
                 LIMIT 1) "start_s" ON (true))
             LEFT JOIN LATERAL ( SELECT "s"."net_equity"
                   FROM "public"."daily_snapshots" "s"
                  WHERE ("s"."snapshot_date" <= "m_1"."month_end")
                  ORDER BY "s"."snapshot_date" DESC
                 LIMIT 1) "end_s" ON (true))
          GROUP BY "m_1"."month_start", "m_1"."month_end", "start_s"."net_equity", "end_s"."net_equity"
        )
 SELECT "m"."month_start" AS "snapshot_date",
    "mp"."pnl",
    (COALESCE("mt"."loan_interest", (0)::numeric) + COALESCE("mt"."margin_interest", (0)::numeric)) AS "interest",
    COALESCE("mt"."total_taxes", (0)::numeric) AS "tax",
    COALESCE("mt"."total_fees", (0)::numeric) AS "fee"
   FROM (("month_ranges" "m"
     LEFT JOIN "monthly_pnl" "mp" ON (("mp"."month_start" = "m"."month_start")))
     LEFT JOIN "monthly_transactions" "mt" ON (("mt"."month" = "m"."month_start")))
  ORDER BY "m"."month_start" DESC;

CREATE OR REPLACE VIEW "public"."yearly_snapshots" WITH ("security_invoker"='on') AS
 WITH "annual_cashflow" AS (
         SELECT (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))::integer AS "year",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" > (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" < (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_snapshots"
          GROUP BY (EXTRACT(year FROM "daily_snapshots"."snapshot_date"))
        ), "equity_data" AS (
         SELECT EXTRACT(year FROM "daily_snapshots"."snapshot_date") AS "yr",
            "daily_snapshots"."snapshot_date" AS "dps_date",
            "daily_snapshots"."equity_index"
           FROM "public"."daily_snapshots"
          WHERE ("daily_snapshots"."equity_index" IS NOT NULL)
        ), "equity_end_of_year" AS (
         SELECT "equity_data"."yr",
            "max"("equity_data"."dps_date") AS "last_date"
           FROM "equity_data"
          GROUP BY "equity_data"."yr"
        ), "equity_with_prev" AS (
         SELECT "e"."yr",
            "eoy"."last_date",
            "e"."equity_index" AS "end_value",
            "lag"("e"."equity_index") OVER (ORDER BY "e"."yr") AS "start_value"
           FROM ("equity_end_of_year" "eoy"
             JOIN "equity_data" "e" ON (("e"."dps_date" = "eoy"."last_date")))
        ), "vnindex_data" AS (
         SELECT EXTRACT(year FROM "daily_market_indices"."date") AS "yr",
            "daily_market_indices"."date" AS "dmi_date",
            "daily_market_indices"."close"
           FROM "public"."daily_market_indices"
          WHERE (("daily_market_indices"."symbol" = 'VNINDEX'::"text") AND ("daily_market_indices"."close" IS NOT NULL))
        ), "vnindex_end_of_year" AS (
         SELECT "vnindex_data"."yr",
            "max"("vnindex_data"."dmi_date") AS "last_date"
           FROM "vnindex_data"
          GROUP BY "vnindex_data"."yr"
        ), "vnindex_with_prev" AS (
         SELECT "v"."yr",
            "voy"."last_date",
            "v"."close" AS "end_value",
            "lag"("v"."close") OVER (ORDER BY "v"."yr") AS "start_value"
           FROM ("vnindex_end_of_year" "voy"
             JOIN "vnindex_data" "v" ON (("v"."dmi_date" = "voy"."last_date")))
        ), "yearly_returns" AS (
         SELECT (COALESCE("e"."yr", "v"."yr"))::integer AS "year",
            "round"(((("e"."end_value" - "e"."start_value") / "e"."start_value") * (100)::numeric), 2) AS "equity_ret",
            "round"(((("v"."end_value" - "v"."start_value") / "v"."start_value") * (100)::numeric), 2) AS "vn_ret"
           FROM ("equity_with_prev" "e"
             FULL JOIN "vnindex_with_prev" "v" ON (("e"."yr" = "v"."yr")))
          WHERE (("e"."start_value" IS NOT NULL) OR ("v"."start_value" IS NOT NULL))
        ), "all_time_cashflow" AS (
         SELECT "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" > (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "deposits",
            "sum"(
                CASE
                    WHEN ("daily_snapshots"."net_cashflow" < (0)::numeric) THEN "daily_snapshots"."net_cashflow"
                    ELSE (0)::numeric
                END) AS "withdrawals"
           FROM "public"."daily_snapshots"
        ), "scalar_values" AS (
         SELECT ( SELECT "daily_snapshots"."equity_index"
                   FROM "public"."daily_snapshots"
                  ORDER BY "daily_snapshots"."snapshot_date"
                 LIMIT 1) AS "first_equity",
            ( SELECT "daily_snapshots"."equity_index"
                   FROM "public"."daily_snapshots"
                  ORDER BY "daily_snapshots"."snapshot_date" DESC
                 LIMIT 1) AS "last_equity",
            ( SELECT "daily_market_indices"."close"
                   FROM "public"."daily_market_indices"
                  WHERE ("daily_market_indices"."symbol" = 'VNINDEX'::"text")
                  ORDER BY "daily_market_indices"."date"
                 LIMIT 1) AS "first_vnindex",
            ( SELECT "daily_market_indices"."close"
                   FROM "public"."daily_market_indices"
                  WHERE ("daily_market_indices"."symbol" = 'VNINDEX'::"text")
                  ORDER BY "daily_market_indices"."date" DESC
                 LIMIT 1) AS "last_vnindex"
        ), "all_time" AS (
         SELECT 9999 AS "year",
            "round"(((("sv"."last_equity" - "sv"."first_equity") / "sv"."first_equity") * (100)::numeric), 2) AS "equity_ret",
            "round"(((("sv"."last_vnindex" - "sv"."first_vnindex") / "sv"."first_vnindex") * (100)::numeric), 2) AS "vn_ret",
            "ac"."deposits",
            "ac"."withdrawals"
           FROM ("scalar_values" "sv"
             CROSS JOIN "all_time_cashflow" "ac")
        ), "yearly_combined" AS (
         SELECT "yr"."year",
            "cf"."deposits",
            "cf"."withdrawals",
            "yr"."equity_ret",
            "yr"."vn_ret"
           FROM ("yearly_returns" "yr"
             LEFT JOIN "annual_cashflow" "cf" ON (("yr"."year" = "cf"."year")))
        ), "combined" AS (
         SELECT "yearly_combined"."year",
            "yearly_combined"."deposits",
            "yearly_combined"."withdrawals",
            "yearly_combined"."equity_ret",
            "yearly_combined"."vn_ret"
           FROM "yearly_combined"
        UNION ALL
         SELECT "all_time"."year",
            "all_time"."deposits",
            "all_time"."withdrawals",
            "all_time"."equity_ret",
            "all_time"."vn_ret"
           FROM "all_time"
        )
 SELECT
        CASE
            WHEN ("year" = 9999) THEN 'All-Time'::"text"
            ELSE ("year")::"text"
        END AS "year",
    "deposits",
    "withdrawals",
    "equity_ret",
    "vn_ret"
   FROM "combined"
  ORDER BY
        CASE
            WHEN ("year" = 9999) THEN 9999
            ELSE "year"
        END;

CREATE OR REPLACE VIEW "public"."dashboard_data" WITH ("security_invoker"='on') AS
 WITH "params" AS (
         SELECT CURRENT_DATE AS "today",
            ("date_trunc"('year'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "start_of_year",
            ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date" AS "start_of_month",
            '2000-01-01'::"date" AS "start_of_all"
        ), "pnl" AS (
         SELECT "public"."calculate_pnl"("params"."start_of_year", "params"."today") AS "pnl_ytd",
            "public"."calculate_pnl"("params"."start_of_month", "params"."today") AS "pnl_mtd"
           FROM "params"
        ), "twr" AS (
         SELECT "public"."calculate_twr"("params"."start_of_year", "params"."today") AS "twr_ytd",
            "public"."calculate_twr"("params"."start_of_all", "params"."today") AS "twr_all"
           FROM "params"
        ), "balance" AS (
         SELECT "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'equity'::"public"."asset_class")) AS "total_equity",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'liability'::"public"."asset_class")) AS "total_liabilities",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'fund'::"public"."asset_class")) AS "fund",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'stock'::"public"."asset_class")) AS "stock",
            "sum"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."asset_class" = 'cash'::"public"."asset_class")) AS "cash",
            "max"("balance_sheet"."total_value") FILTER (WHERE ("balance_sheet"."ticker" = 'MARGIN'::"text")) AS "margin"
           FROM "public"."balance_sheet"
        ), "debt" AS (
         SELECT "sum"(("outstanding_debts"."principal" + "outstanding_debts"."interest")) AS "debts"
           FROM "public"."outstanding_debts"
        ), "monthly" AS (
         SELECT "sum"("last_12"."pnl") AS "total_pnl",
            "avg"("last_12"."pnl") AS "avg_profit",
            "avg"((("last_12"."interest" + "last_12"."tax") + "last_12"."fee")) AS "avg_expense",
            ( SELECT "jsonb_agg"("jsonb_build_object"('revenue', (((COALESCE("last_12"."pnl", (0)::numeric) + COALESCE("last_12"."fee", (0)::numeric)) + COALESCE("last_12"."interest", (0)::numeric)) + COALESCE("last_12"."tax", (0)::numeric)), 'fee', COALESCE("last_12"."fee", (0)::numeric), 'interest', COALESCE("last_12"."interest", (0)::numeric), 'tax', COALESCE("last_12"."tax", (0)::numeric), 'snapshot_date', ("last_12"."snapshot_date")::"text") ORDER BY "last_12"."snapshot_date") AS "jsonb_agg") AS "profit_chart"
           FROM ( SELECT "monthly_snapshots"."snapshot_date",
                    "monthly_snapshots"."pnl",
                    "monthly_snapshots"."interest",
                    "monthly_snapshots"."tax",
                    "monthly_snapshots"."fee"
                   FROM "public"."monthly_snapshots"
                  ORDER BY "monthly_snapshots"."snapshot_date" DESC
                 LIMIT 12) "last_12"
        )
 SELECT "pnl"."pnl_ytd",
    "pnl"."pnl_mtd",
    "twr"."twr_ytd",
    "twr"."twr_all",
    "balance"."total_equity",
    "balance"."total_liabilities",
    "balance"."fund",
    "balance"."stock",
    "balance"."cash",
    "balance"."margin",
    "debt"."debts",
    "monthly"."total_pnl",
    "monthly"."avg_profit",
    "monthly"."avg_expense",
    "monthly"."profit_chart"
   FROM (((("pnl"
     CROSS JOIN "twr")
     CROSS JOIN "balance")
     CROSS JOIN "debt")
     CROSS JOIN "monthly");
