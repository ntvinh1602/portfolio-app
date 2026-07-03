CREATE TABLE IF NOT EXISTS "public"."dnse_order_events" (
    "id"                 bigint NOT NULL,
    "side"               text NOT NULL,
    "account_no"         text NOT NULL,
    "symbol"             text NOT NULL,
    "order_type"         text NOT NULL,
    "price"              numeric NOT NULL,
    "quantity"           integer NOT NULL,
    "fill_quantity"      integer NOT NULL DEFAULT 0,
    "canceled_quantity"  integer NOT NULL DEFAULT 0,
    "leave_quantity"     integer NOT NULL DEFAULT 0,
    "order_status"       text NOT NULL,
    "loan_package_id"    integer,
    "market_type"        text NOT NULL,
    "trans_date"         timestamp with time zone NOT NULL,
    "created_date"       timestamp with time zone NOT NULL,
    "modified_date"      timestamp with time zone NOT NULL,
    "received_at"        timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "public"."dnse_order_events"
    ADD CONSTRAINT "dnse_order_events_pkey" PRIMARY KEY ("id");

CREATE INDEX "dnse_order_events_symbol_idx" ON "public"."dnse_order_events" USING btree ("symbol");

CREATE INDEX "dnse_order_events_order_status_idx" ON "public"."dnse_order_events" USING btree ("order_status");

ALTER TABLE "public"."dnse_order_events" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."dnse_order_events" TO "anon";
GRANT ALL ON TABLE "public"."dnse_order_events" TO "authenticated";
GRANT ALL ON TABLE "public"."dnse_order_events" TO "service_role";
