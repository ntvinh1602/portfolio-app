drop function if exists "public"."handle_split_transaction"("uuid", "uuid", numeric, "date", "text");

CREATE OR REPLACE FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" numeric, "p_transaction_date" "date", "p_description" "text", "p_created_at" timestamptz default now()) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_id UUID;
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_asset_account_id UUID;
    v_asset_currency_code TEXT;
    v_capital_security_id UUID;
BEGIN
    SELECT id INTO v_equity_account_id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity' LIMIT 1;
    IF v_equity_account_id IS NULL THEN RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id; END IF;
    SELECT id INTO v_capital_security_id FROM securities WHERE ticker = 'CAPITAL' LIMIT 1;
    IF v_capital_security_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' security not found'; END IF;
    SELECT id INTO v_capital_asset_id FROM assets WHERE user_id = p_user_id AND security_id = v_capital_security_id LIMIT 1;
    IF v_capital_asset_id IS NULL THEN RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id; END IF;
    SELECT tl.account_id, s.currency_code INTO v_asset_account_id, v_asset_currency_code
    FROM transaction_legs tl
    JOIN assets a ON a.id = tl.asset_id
    JOIN securities s ON a.security_id = s.id
    WHERE tl.asset_id = p_asset_id
    LIMIT 1;
    IF v_asset_account_id IS NULL THEN RAISE EXCEPTION 'Could not determine an account for asset %', p_asset_id; END IF;
    INSERT INTO transactions (user_id, transaction_date, type, description, created_at) VALUES (p_user_id, p_transaction_date, 'split', p_description, p_created_at) RETURNING id INTO v_transaction_id;
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code) VALUES
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis) VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);
END;
$$;