CREATE OR REPLACE FUNCTION "public"."update_assets_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update all assets linked to the inserted transaction
  UPDATE public.assets a
  SET current_quantity = CASE
    WHEN s.ticker = 'INTERESTS' THEN COALESCE((
      SELECT SUM(
        d.principal_amount *
        (POWER(1 + (d.interest_rate / 100 / 365), (CURRENT_DATE - d.start_date)) - 1)
      )
      FROM public.debts d
      WHERE d.is_active
    ), 0)
    ELSE COALESCE((
      SELECT SUM(quantity)
      FROM public.transaction_legs tl
      WHERE tl.asset_id = a.id
    ), 0)
  END
  FROM public.securities s
  WHERE a.security_id = s.id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."process_dnse_orders"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  unprocessed_order RECORD;
  v_asset_id uuid;
  v_cash_asset_id uuid;
BEGIN
  -- Get the VND cash asset ID for the user. This is used for all transactions.
  v_cash_asset_id := public.get_asset_id_from_ticker('VND');

  FOR unprocessed_order IN
    SELECT * FROM public.dnse_orders WHERE txn_created = false
  LOOP
    -- Get the asset_id for the security being traded
    v_asset_id := public.get_asset_id_from_ticker(unprocessed_order.symbol);

    -- Create a buy or sell transaction
    IF unprocessed_order.side = 'NB' THEN
      PERFORM public.add_buy_transaction(
        unprocessed_order.modified_date::date,
        v_asset_id,
        v_cash_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        'Buy ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      );
    ELSIF unprocessed_order.side = 'NS' THEN
      PERFORM public.add_sell_transaction(
        v_asset_id,
        unprocessed_order.fill_quantity,
        unprocessed_order.average_price,
        unprocessed_order.modified_date::date,
        v_cash_asset_id,
        'Sell ' || unprocessed_order.fill_quantity || ' ' || unprocessed_order.symbol || ' at ' || unprocessed_order.average_price,
        unprocessed_order.modified_date
      );
    END IF;

    -- Create an expense transaction for the tax, if applicable
    IF unprocessed_order.tax > 0 THEN
      PERFORM public.add_expense_transaction(
        unprocessed_order.modified_date::date,
        unprocessed_order.tax,
        'Income tax',
        v_cash_asset_id,
        unprocessed_order.modified_date
      );
    END IF;

    -- Create an expense transaction for the fee, if applicable
    IF unprocessed_order.fee > 0 THEN
      PERFORM public.add_expense_transaction(
        unprocessed_order.modified_date::date,
        unprocessed_order.fee,
        'Transaction fee',
        v_cash_asset_id,
        unprocessed_order.modified_date
      );
    END IF;

    -- Mark the order as processed
    UPDATE public.dnse_orders SET txn_created = true WHERE id = unprocessed_order.id;

  END LOOP;
END;
$$;