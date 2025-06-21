-- This migration cleans up old, deprecated transaction functions that have been replaced
-- by new versions with different function signatures.

-- Dropping the original, flawed handle_buy_transaction from migration 0010
DROP FUNCTION IF EXISTS handle_buy_transaction(uuid, date, uuid, uuid, numeric, numeric, numeric, text);

-- Dropping the original, flawed handle_sell_transaction from migration 0011
DROP FUNCTION IF EXISTS handle_sell_transaction(uuid, uuid, numeric, numeric, numeric, date, uuid, text);

-- Dropping the combined income/expense function from migration 0012
DROP FUNCTION IF EXISTS handle_income_expense_transaction(uuid, date, uuid, numeric, text, public.transaction_type);

-- Dropping the original, flawed handle_dividend_transaction from migration 0013
DROP FUNCTION IF EXISTS handle_dividend_transaction(uuid, bigint, numeric, timestamptz, bigint);

-- Dropping the original, flawed handle_borrow_transaction from migration 0014
DROP FUNCTION IF EXISTS handle_borrow_transaction(uuid, text, numeric, numeric, date, uuid);

-- Dropping the original, flawed handle_debt_payment_transaction from migration 0015
DROP FUNCTION IF EXISTS handle_debt_payment_transaction(bigint, numeric, numeric, timestamptz, bigint);

-- Dropping the original, flawed handle_split_transaction from migration 0016
DROP FUNCTION IF EXISTS handle_split_transaction(uuid, numeric, timestamptz);

-- Dropping the original deposit function from migration 0017 (before asset_id was added)
DROP FUNCTION IF EXISTS handle_deposit_transaction(uuid, date, uuid, numeric, text);

-- Dropping the original withdraw function from migration 0018 (before asset_id was added)
DROP FUNCTION IF EXISTS handle_withdraw_transaction(uuid, date, uuid, numeric, text);

-- Dropping the flawed dividend function from migration 0028
DROP FUNCTION IF EXISTS handle_dividend_transaction(uuid, date, uuid, numeric, text, uuid, uuid);