CREATE OR REPLACE FUNCTION "public"."process_tx_debt"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  r tx_debt%rowtype;
  v_cash_asset uuid;
  v_debt_asset uuid;
  v_equity_asset uuid;
begin
  -- Load transaction
  select * into r from public.tx_debt where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker = 'FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  select id into v_debt_asset from public.assets where ticker = 'DEBTS';

  -- Clear any prior legs for this transaction
  delete from public.tx_legs where tx_id = p_tx_id;

  -- Process operation type
  if r.operation = 'borrow' then
    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit debt
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, r.net_proceed, 0, r.net_proceed);

  else -- Repay operation
    -- Credit cash (payment)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

    -- Debit debt (liability reduced)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_debt_asset, -r.principal, r.principal, 0);

    -- Debit equity (interest expense)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_equity_asset, -r.interest, r.interest, 0);
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."process_tx_stock"("p_tx_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  r tx_stock%rowtype;
  v_pos asset_positions%rowtype;
  v_cash_asset uuid;
  v_equity_asset uuid;
  v_stock_asset uuid;
  v_new_qty numeric;
  v_new_avg_cost numeric;
  v_realized_gain numeric := 0;
  v_cost_basis numeric := 0;
begin
  -- Load the transaction
  select * into r from public.tx_stock where tx_id = p_tx_id;

  -- Resolve asset IDs
  select id into v_cash_asset from public.assets where ticker ='FX.VND';
  select id into v_equity_asset from public.assets where ticker = 'CAPITAL';
  v_stock_asset := r.stock_id;

  -- Fetch or initialize position
  select * into v_pos from public.asset_positions where asset_id = r.stock_id;
  if not found then
    insert into public.asset_positions (asset_id, quantity, average_cost)
    values (r.stock_id, 0, 0)
    returning * into v_pos;
  end if;

  -- Process transaction
  if r.side = 'buy' then
    v_new_qty := v_pos.quantity + r.quantity;
    v_new_avg_cost :=
      case
        when v_new_qty = 0 then 0
        else (v_pos.average_cost * v_pos.quantity + r.net_proceed) / v_new_qty
      end;

    update public.asset_positions
    set quantity = v_new_qty,
      average_cost = v_new_avg_cost
    where asset_id = r.stock_id;

    -- Generate ledger for BUY
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit stock (increase holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, r.quantity, r.net_proceed, 0);

    -- Credit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, -r.net_proceed, 0, r.net_proceed);

  else -- Sell side
    if v_pos.quantity < r.quantity then
      raise exception 'Not enough shares to sell for stock %', r.stock_id;
    end if;

    v_cost_basis := v_pos.average_cost * r.quantity;
    v_realized_gain := r.net_proceed - v_cost_basis;

    update public.asset_positions
    set quantity = v_pos.quantity - r.quantity
    where asset_id = r.stock_id;

    -- Generate ledger for SELL
    delete from public.tx_legs where tx_id = p_tx_id;

    -- Debit cash
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_cash_asset, r.net_proceed, r.net_proceed, 0);

    -- Credit stock (reduce holdings)
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (r.tx_id, v_stock_asset, -r.quantity, 0, v_cost_basis);

    -- Post gain/loss to equity
    insert into public.tx_legs (tx_id, asset_id, quantity, debit, credit)
    values (
      r.tx_id,
      v_equity_asset,
      v_realized_gain,
      GREATEST(-v_realized_gain, 0), -- Debit equity when negative realized gain
      GREATEST(v_realized_gain, 0) -- Credit equity when positive realized gain
    );
  end if;
end;
$$;

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
                    WHEN ("a"."ticker" = 'PNL'::"text") THEN ( SELECT "pnl"."?column?"
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