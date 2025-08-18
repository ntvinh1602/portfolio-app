CREATE OR REPLACE FUNCTION public.process_dnse_orders()
RETURNS void
LANGUAGE plpgsql
SET "search_path" TO 'public'
AS $$
DECLARE
  unprocessed_order RECORD;
  v_asset_id uuid;
  v_cash_asset_id uuid;
  v_user_id uuid;
BEGIN
  -- Since we don't have a user_id in dnse_orders, we'll need to get it from the profiles table.
  -- This assumes there is only one user. If there are multiple users, this logic will need to be adjusted.
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;

  -- Get the VND cash asset ID for the user. This is used for all transactions.
  v_cash_asset_id := public.get_asset_id_from_ticker(v_user_id, 'VND');

  FOR unprocessed_order IN
    SELECT * FROM public.dnse_orders WHERE txn_created = false
  LOOP
    -- Get the asset_id for the security being traded
    v_asset_id := public.get_asset_id_from_ticker(v_user_id, unprocessed_order.symbol);

    -- Create a buy or sell transaction
    IF unprocessed_order.side = 'NB' THEN
      PERFORM public.add_buy_transaction(
        v_user_id,
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
        v_user_id,
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
        v_user_id,
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
        v_user_id,
        unprocessed_order.modified_date::date,
        unprocessed_order.fee,
        'Transaction fee',
        v_cash_asset_id,
        unprocessed_order.modified_date
      );
    END IF;

    -- Mark the order as processed
    UPDATE public.dnse_orders
    SET txn_created = true
    WHERE id = unprocessed_order.id;

  END LOOP;
END;
$$;