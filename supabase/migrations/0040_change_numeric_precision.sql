-- Alter tables to use numeric(16,2)
ALTER TABLE "public"."debts"
  ALTER COLUMN "principal_amount" TYPE numeric(16,2),
  ALTER COLUMN "interest_rate" TYPE numeric(4,2);

ALTER TABLE "public"."exchange_rates"
  ALTER COLUMN "rate" TYPE numeric(10,2);

ALTER TABLE "public"."lot_consumptions"
  ALTER COLUMN "quantity_consumed" TYPE integer;

ALTER TABLE "public"."tax_lots"
  ALTER COLUMN "original_quantity" TYPE integer,
  ALTER COLUMN "cost_basis" TYPE numeric(16,2),
  ALTER COLUMN "remaining_quantity" TYPE integer;

ALTER TABLE "public"."transaction_details"
  ALTER COLUMN "price" TYPE numeric(10,2),
  ALTER COLUMN "fees" TYPE numeric(16,2),
  ALTER COLUMN "taxes" TYPE numeric(16,2);

ALTER TABLE "public"."transaction_legs"
  ALTER COLUMN "quantity" TYPE numeric(16,2),
  ALTER COLUMN "amount" TYPE numeric(16,2);

-- Recreate functions with numeric(16,2)

DROP FUNCTION IF EXISTS "public"."get_asset_balance"(uuid, uuid);
CREATE OR REPLACE FUNCTION "public"."get_asset_balance"("p_asset_id" "uuid", "p_user_id" "uuid") RETURNS numeric(16,2)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_balance NUMERIC(16,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM transaction_legs
    WHERE asset_id = p_asset_id
    AND transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);

    RETURN v_balance;
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_borrow_transaction"(uuid, text, numeric, numeric, date, uuid, uuid, text);
CREATE OR REPLACE FUNCTION "public"."handle_borrow_transaction"("p_user_id" "uuid", "p_lender_name" "text", "p_principal_amount" numeric(16,2), "p_interest_rate" numeric(4,2), "p_transaction_date" "date", "p_deposit_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_loans_payable_asset_id uuid;
    v_transaction_id uuid;
    v_cash_asset_currency_code text;
    v_debt_id uuid;
    v_loans_payable_account_id uuid;
    v_liability_currency_code text;
BEGIN
    -- 1. Get or create the 'Loans Payable' asset
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM assets
    WHERE user_id = p_user_id AND name = 'Loans Payable' AND asset_class = 'liability'
    LIMIT 1;

    IF v_loans_payable_asset_id IS NULL THEN
        -- Assuming a default currency for the liability if it needs to be created.
        -- This could be parameterized if needed.
        SELECT display_currency INTO v_liability_currency_code FROM profiles WHERE id = p_user_id;
        INSERT INTO assets (user_id, name, ticker, asset_class, currency_code)
        VALUES (p_user_id, 'Loans Payable', 'LOANS_PAYABLE', 'liability', v_liability_currency_code)
        RETURNING id INTO v_loans_payable_asset_id;
    END IF;

    -- 2. Get the conceptual 'Liability' account
    SELECT id INTO v_loans_payable_account_id
    FROM accounts
    WHERE user_id = p_user_id AND name = 'Liability' AND type = 'conceptual'
    LIMIT 1;

    IF v_loans_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Liability conceptual account not found for user %', p_user_id;
    END IF;

    -- 3. Get the currency of the cash asset that will receive the funds
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Specified cash asset not found for account %', p_deposit_account_id;
    END IF;

    -- 4. Create the debt record
    INSERT INTO debts (user_id, lender_name, principal_amount, currency_code, interest_rate, start_date, status)
    VALUES (p_user_id, p_lender_name, p_principal_amount, v_cash_asset_currency_code, p_interest_rate, p_transaction_date, 'active')
    RETURNING id INTO v_debt_id;

    -- 5. Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'borrow', p_description, v_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 6. Create the transaction legs
    -- Debit the deposit account (increase cash)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_deposit_account_id, p_cash_asset_id, p_principal_amount, p_principal_amount, v_cash_asset_currency_code);

    -- Credit the Loans Payable liability account (increase liability)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, v_loans_payable_account_id, v_loans_payable_asset_id, p_principal_amount * -1, p_principal_amount * -1, v_liability_currency_code);

END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_buy_transaction"(uuid, date, uuid, uuid, uuid, numeric, numeric, numeric, text);
CREATE OR REPLACE FUNCTION "public"."handle_buy_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_asset_id" "uuid", "p_cash_asset_id" "uuid", "p_quantity" integer, "p_price" numeric(10,2), "p_fees" numeric(16,2), "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid;
    v_cost_basis numeric(16,2);
    v_cash_asset_currency_code text;
    v_purchased_asset_currency_code text;
BEGIN
    -- 1. Calculate total cost basis
    v_cost_basis := (p_quantity * p_price) + p_fees;

    -- 2. Get the currency code for the selected cash asset
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Get the currency code for the purchased asset
    SELECT currency_code INTO v_purchased_asset_currency_code
    FROM assets
    WHERE id = p_asset_id;

    -- 4. Create the main transaction record
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'buy', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Credit: Decrease cash from the source account
        (v_transaction_id, p_account_id, p_cash_asset_id, v_cost_basis * -1, v_cost_basis * -1, v_cash_asset_currency_code),
        -- Debit: Increase the asset in the same account
        (v_transaction_id, p_account_id, p_asset_id, p_quantity, v_cost_basis, v_purchased_asset_currency_code);

    -- 6. Create the tax lot
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'purchase', p_transaction_date, p_quantity, p_quantity, v_cost_basis);

    -- 7. Insert into transaction_details
    INSERT INTO transaction_details (transaction_id, price, fees, taxes)
    VALUES (v_transaction_id, p_price, p_fees, 0);

    RETURN v_transaction_id;
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_debt_payment_transaction"(uuid, uuid, numeric, numeric, date, uuid, uuid, text);
CREATE OR REPLACE FUNCTION "public"."handle_debt_payment_transaction"("p_user_id" "uuid", "p_debt_id" "uuid", "p_principal_payment" numeric(16,2), "p_interest_payment" numeric(16,2), "p_transaction_date" "date", "p_from_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id uuid;
    v_loans_payable_asset_id uuid;
    v_retained_earnings_asset_id uuid;
    v_total_payment numeric(16,2);
    v_cash_asset_currency_code text;
    v_liability_currency_code text;
    v_liability_balance numeric(16,2);
BEGIN
    -- 1. Look up asset IDs
    SELECT id, currency_code INTO v_loans_payable_asset_id, v_liability_currency_code
    FROM assets WHERE name = 'Loans Payable' AND user_id = p_user_id;

    SELECT id INTO v_retained_earnings_asset_id
    FROM assets WHERE name = 'Retained Earnings' AND user_id = p_user_id;

    IF v_loans_payable_asset_id IS NULL OR v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Core equity/liability assets not found for user %', p_user_id;
    END IF;

    -- 2. Get the currency of the cash asset being used for payment
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find specified cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Calculate the total payment amount
    v_total_payment := p_principal_payment + p_interest_payment;

    -- 4. Create a new transactions record
    INSERT INTO transactions (user_id, transaction_date, type, description, related_debt_id)
    VALUES (p_user_id, p_transaction_date, 'debt_payment', p_description, p_debt_id)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    -- Credit: Decrease cash from the paying account
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_from_account_id, p_cash_asset_id, v_total_payment * -1, v_total_payment * -1, v_cash_asset_currency_code);

    -- Debit: Decrease the "Loans Payable" liability for the principal portion
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Liability' AND user_id = p_user_id), v_loans_payable_asset_id, p_principal_payment, p_principal_payment, v_liability_currency_code);

    -- Debit: Decrease "Retained Earnings" for the interest portion (as an expense)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id), v_retained_earnings_asset_id, p_interest_payment, p_interest_payment, v_cash_asset_currency_code);

    -- 6. Check if the debt is now paid off by checking the balance of the liability legs
    SELECT COALESCE(SUM(tl.quantity), 0) INTO v_liability_balance
    FROM transaction_legs tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE t.related_debt_id = p_debt_id AND tl.asset_id = v_loans_payable_asset_id;

    -- If the balance is 0 or positive, the debt is considered paid off.
    IF v_liability_balance >= 0 THEN
        UPDATE debts SET status = 'paid_off' WHERE id = p_debt_id;
    END IF;

END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_deposit_transaction"(uuid, date, uuid, numeric, text, uuid);
CREATE OR REPLACE FUNCTION "public"."handle_deposit_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_capital_asset_id UUID;
    v_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Get the 'Paid-in Capital' asset
    SELECT id INTO v_capital_asset_id
    FROM public.assets
    WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_capital_asset_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Paid-in Capital'' asset.');
    END IF;

    -- 2. Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified asset.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id
    FROM public.accounts
    WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'deposit', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create the transaction legs
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit: Increase cash in the destination account
        (v_transaction_id, p_account_id, p_asset_id, p_amount, p_amount, v_asset_currency_code),
        -- Credit: Increase 'Paid-in Capital'
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, p_amount * -1, p_amount * -1, v_asset_currency_code);

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_expense_transaction"(uuid, date, uuid, numeric, text, uuid);
CREATE OR REPLACE FUNCTION "public"."handle_expense_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
BEGIN
    -- 1. Fetch required equity asset records
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.';
    END IF;

    -- 2. Get the currency of the cash asset being spent
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified cash asset.';
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not find ''Equity'' conceptual account.';
    END IF;

    -- 4. Determine amounts to draw from each equity component
    -- Note: get_asset_balance returns a negative value for equity, so we use ABS()
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RAISE EXCEPTION 'Expense amount exceeds available capital.';
        END IF;
    END IF;

    -- 5. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'expense', p_description)
    RETURNING id INTO v_transaction_id;

    -- 6. Create transaction legs
    -- Credit: Decrease cash from the source account
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code);

    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_income_transaction"(uuid, date, uuid, numeric, text, uuid);
CREATE OR REPLACE FUNCTION "public"."handle_income_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_asset_currency_code text;
    v_retained_earnings_currency_code text;
BEGIN
    -- Get the 'Retained Earnings' asset for the user
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'EARNINGS'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- Get the currency of the specified asset
    SELECT currency_code INTO v_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find the specified asset with ID %', p_asset_id;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'income', p_description)
    RETURNING id INTO v_transaction_id;

    -- Create transaction legs: Debit cash, Credit Retained Earnings
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        (v_transaction_id, p_account_id, p_asset_id, p_amount, p_amount, v_asset_currency_code),
        (v_transaction_id, (SELECT id FROM accounts WHERE name = 'Equity' AND user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, p_amount * -1, p_amount * -1, v_retained_earnings_currency_code);
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_sell_transaction"(uuid, uuid, numeric, numeric, numeric, numeric, date, uuid, uuid, text);
CREATE OR REPLACE FUNCTION "public"."handle_sell_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity_to_sell" integer, "p_total_proceeds" numeric(16,2), "p_fees" numeric(16,2), "p_taxes" numeric(16,2), "p_transaction_date" "date", "p_cash_account_id" "uuid", "p_cash_asset_id" "uuid", "p_description" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_cost_basis numeric(16,2) := 0;
    v_realized_gain_loss numeric(16,2);
    v_retained_earnings_asset_id uuid;
    v_transaction_id uuid;
    v_remaining_quantity_to_sell integer := p_quantity_to_sell;
    v_lot record;
    v_quantity_from_lot integer;
    v_cost_basis_from_lot numeric(16,2);
    v_cash_asset_currency_code text;
    v_sold_asset_currency_code text;
    v_retained_earnings_currency_code text;
    v_asset_leg_id uuid;
    v_consumed_lot record;
BEGIN
    -- Create a temporary table to store consumed lots for this transaction
    CREATE TEMP TABLE temp_consumed_lots (
        lot_id uuid,
        quantity_consumed integer
    ) ON COMMIT DROP;

    -- 1. Get Retained Earnings asset ID
    SELECT id, currency_code INTO v_retained_earnings_asset_id, v_retained_earnings_currency_code
    FROM assets
    WHERE user_id = p_user_id AND name = 'Retained Earnings' AND asset_class = 'equity'
    LIMIT 1;

    IF v_retained_earnings_asset_id IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings asset not found for user %', p_user_id;
    END IF;

    -- 2. Get cash asset currency
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM assets
    WHERE id = p_cash_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RAISE EXCEPTION 'Could not find a cash asset with ID %', p_cash_asset_id;
    END IF;

    -- 3. Get sold asset currency
    SELECT currency_code INTO v_sold_asset_currency_code FROM assets WHERE id = p_asset_id;

    -- 4. Iterate through tax lots (FIFO), calculate cost basis, and record consumptions
    FOR v_lot IN
        SELECT *
        FROM tax_lots
        WHERE user_id = p_user_id
          AND asset_id = p_asset_id
          AND remaining_quantity > 0
        ORDER BY creation_date ASC
    LOOP
        IF v_remaining_quantity_to_sell <= 0 THEN
            EXIT;
        END IF;

        v_quantity_from_lot := LEAST(v_remaining_quantity_to_sell, v_lot.remaining_quantity);
        v_cost_basis_from_lot := (v_lot.cost_basis / v_lot.original_quantity) * v_quantity_from_lot;

        -- Update tax lot
        UPDATE tax_lots
        SET remaining_quantity = remaining_quantity - v_quantity_from_lot
        WHERE id = v_lot.id;

        -- Store consumed lot info in the temp table
        INSERT INTO temp_consumed_lots (lot_id, quantity_consumed)
        VALUES (v_lot.id, v_quantity_from_lot);

        v_total_cost_basis := v_total_cost_basis + v_cost_basis_from_lot;
        v_remaining_quantity_to_sell := v_remaining_quantity_to_sell - v_quantity_from_lot;
    END LOOP;

    -- 5. Check if all shares were available to sell
    IF v_remaining_quantity_to_sell > 0 THEN
        RAISE EXCEPTION 'Not enough shares to sell. Tried to sell %, but only % were available.', p_quantity_to_sell, (p_quantity_to_sell - v_remaining_quantity_to_sell);
    END IF;

    -- 6. Create the main transaction record
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'sell', p_description)
    RETURNING id INTO v_transaction_id;

    -- 7. Calculate realized gain/loss
    v_realized_gain_loss := p_total_proceeds - v_total_cost_basis - p_fees - p_taxes;

    -- 8. Create the 3-legged transaction
    -- Debit: Increase cash from the sale
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_cash_asset_id, p_total_proceeds - p_fees - p_taxes, p_total_proceeds - p_fees - p_taxes, v_cash_asset_currency_code);

    -- Credit: Decrease the asset sold by its cost basis
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_cash_account_id, p_asset_id, p_quantity_to_sell * -1, v_total_cost_basis * -1, v_sold_asset_currency_code)
    RETURNING id INTO v_asset_leg_id;

    -- Credit/Debit: Record the gain or loss in Retained Earnings (Credit for gain, Debit for loss)
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, (SELECT id FROM accounts WHERE user_id = p_user_id AND type = 'conceptual' LIMIT 1), v_retained_earnings_asset_id, v_realized_gain_loss * -1, v_realized_gain_loss * -1, v_retained_earnings_currency_code);

    -- 9. Create lot consumption records from the temp table
    FOR v_consumed_lot IN SELECT * FROM temp_consumed_lots
    LOOP
        INSERT INTO lot_consumptions (sell_transaction_leg_id, tax_lot_id, quantity_consumed)
        VALUES (v_asset_leg_id, v_consumed_lot.lot_id, v_consumed_lot.quantity_consumed);
    END LOOP;
    
    -- 10. Insert into transaction_details
    INSERT INTO transaction_details (transaction_id, price, fees, taxes)
    VALUES (v_transaction_id, p_total_proceeds / p_quantity_to_sell, p_fees, p_taxes);

    RETURN v_transaction_id;
END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_split_transaction"(uuid, uuid, numeric, date, text);
CREATE OR REPLACE FUNCTION "public"."handle_split_transaction"("p_user_id" "uuid", "p_asset_id" "uuid", "p_quantity" integer, "p_transaction_date" "date", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id UUID;
    v_capital_asset_id UUID;
    v_equity_account_id UUID;
    v_asset_account_id UUID;
    v_asset_currency_code TEXT;
BEGIN
    -- 1. Get the user's conceptual "Equity" account
    SELECT id INTO v_equity_account_id
    FROM accounts
    WHERE user_id = p_user_id AND type = 'conceptual' AND name = 'Equity'
    LIMIT 1;

    IF v_equity_account_id IS NULL THEN
        RAISE EXCEPTION 'Conceptual Equity account not found for user %', p_user_id;
    END IF;

    -- 2. Get the user's "Paid-in Capital" asset
    SELECT id INTO v_capital_asset_id
    FROM assets
    WHERE user_id = p_user_id AND ticker = 'CAPITAL'
    LIMIT 1;

    IF v_capital_asset_id IS NULL THEN
        RAISE EXCEPTION '''Paid-in Capital'' asset not found for user %', p_user_id;
    END IF;
    
    -- 3. Find the primary account holding the asset being split.
    -- This is a simplification; a user might hold the same asset in multiple accounts.
    -- We'll pick the first one found.
    SELECT account_id, a.currency_code INTO v_asset_account_id, v_asset_currency_code
    FROM transaction_legs tl
    JOIN assets a ON a.id = tl.asset_id
    WHERE tl.asset_id = p_asset_id
    LIMIT 1;

    IF v_asset_account_id IS NULL THEN
        RAISE EXCEPTION 'Could not determine an account for the asset being split (%). No prior transactions found.', p_asset_id;
    END IF;

    -- 4. Insert the transaction
    INSERT INTO transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'split', p_description)
    RETURNING id INTO v_transaction_id;

    -- 5. Create zero-amount transaction legs
    INSERT INTO transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES
        -- Debit the asset account to record the event, but with zero value change. Quantity is informational.
        (v_transaction_id, v_asset_account_id, p_asset_id, p_quantity, 0, v_asset_currency_code),
        -- Credit Paid-in Capital as the balancing entry, also with zero value.
        (v_transaction_id, v_equity_account_id, v_capital_asset_id, 0, 0, v_asset_currency_code);

    -- 6. Create the new tax lot
    INSERT INTO tax_lots (user_id, asset_id, creation_transaction_id, origin, creation_date, original_quantity, remaining_quantity, cost_basis)
    VALUES (p_user_id, p_asset_id, v_transaction_id, 'split', p_transaction_date, p_quantity, p_quantity, 0);

END;
$$;

DROP FUNCTION IF EXISTS "public"."handle_withdraw_transaction"(uuid, date, uuid, numeric, text, uuid);
CREATE OR REPLACE FUNCTION "public"."handle_withdraw_transaction"("p_user_id" "uuid", "p_transaction_date" "date", "p_account_id" "uuid", "p_amount" numeric(16,2), "p_description" "text", "p_asset_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_earnings_asset RECORD;
    v_capital_asset RECORD;
    v_cash_asset_currency_code VARCHAR(10);
    v_equity_account_id UUID;
    v_transaction_id UUID;
    v_earnings_balance NUMERIC(16,2);
    v_draw_from_earnings NUMERIC(16,2);
    v_draw_from_capital NUMERIC(16,2);
    v_capital_balance NUMERIC(16,2);
    v_response JSONB;
BEGIN
    -- 1. Fetch required equity asset records
    SELECT id, currency_code INTO v_earnings_asset FROM public.assets WHERE ticker = 'EARNINGS' AND user_id = p_user_id;
    SELECT id, currency_code INTO v_capital_asset FROM public.assets WHERE ticker = 'CAPITAL' AND user_id = p_user_id;

    IF v_earnings_asset.id IS NULL OR v_capital_asset.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Retained Earnings'' or ''Paid-in Capital'' assets.');
    END IF;

    -- 2. Get the currency of the cash asset being withdrawn
    SELECT currency_code INTO v_cash_asset_currency_code
    FROM public.assets
    WHERE id = p_asset_id AND user_id = p_user_id;

    IF v_cash_asset_currency_code IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find the specified cash asset.');
    END IF;

    -- 3. Get the conceptual 'Equity' account
    SELECT id INTO v_equity_account_id FROM public.accounts WHERE type = 'conceptual' AND name = 'Equity' AND user_id = p_user_id;

    IF v_equity_account_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Could not find ''Equity'' conceptual account.');
    END IF;

    -- 4. Determine amounts to draw from each equity component
    v_earnings_balance := get_asset_balance(v_earnings_asset.id, p_user_id);
    v_draw_from_earnings := LEAST(p_amount, ABS(v_earnings_balance));
    v_draw_from_capital := p_amount - v_draw_from_earnings;

    IF v_draw_from_capital > 0 THEN
        v_capital_balance := get_asset_balance(v_capital_asset.id, p_user_id);
        IF v_draw_from_capital > ABS(v_capital_balance) THEN
            RETURN jsonb_build_object('error', 'Withdrawal amount exceeds available capital.');
        END IF;
    END IF;

    -- 5. Create the transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, description)
    VALUES (p_user_id, p_transaction_date, 'withdraw', COALESCE(p_description, 'Owner draw'))
    RETURNING id INTO v_transaction_id;

    -- 6. Create transaction legs
    -- Credit: Decrease cash from the source account
    INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
    VALUES (v_transaction_id, p_account_id, p_asset_id, p_amount * -1, p_amount * -1, v_cash_asset_currency_code);

    -- Debit: Decrease Retained Earnings
    IF v_draw_from_earnings > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_earnings_asset.id, v_draw_from_earnings, v_draw_from_earnings, v_earnings_asset.currency_code);
    END IF;

    -- Debit: Decrease Paid-in Capital if necessary
    IF v_draw_from_capital > 0 THEN
        INSERT INTO public.transaction_legs (transaction_id, account_id, asset_id, quantity, amount, currency_code)
        VALUES (v_transaction_id, v_equity_account_id, v_capital_asset.id, v_draw_from_capital, v_draw_from_capital, v_capital_asset.currency_code);
    END IF;

    v_response := jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
    RETURN v_response;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;