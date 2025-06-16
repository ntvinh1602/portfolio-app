-- 0001_initial_schema.sql
-- This script sets up the initial database schema for the investment tracker.

-- Step 1: Create Custom ENUM Types
-- These types enforce specific values for certain columns, ensuring data integrity.

CREATE TYPE currency_type AS ENUM ('fiat', 'crypto');
CREATE TYPE account_type AS ENUM ('brokerage', 'crypto_exchange', 'epf', 'bank', 'wallet');
CREATE TYPE asset_class AS ENUM ('cash', 'stock', 'crypto', 'epf');
CREATE TYPE debt_status AS ENUM ('active', 'paid_off');
CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'deposit', 'withdraw', 'expense', 'income', 'contribution', 'dividend', 'debt_payment', 'interest_payment');

-- Step 2: Create Tables
-- We create tables in an order that respects foreign key dependencies.

-- `currencies` table
-- A central table for all supported currencies.
CREATE TABLE currencies (
    code VARCHAR(10) PRIMARY KEY,
    name TEXT NOT NULL,
    type currency_type NOT NULL
);
COMMENT ON TABLE "currencies" IS 'Stores all supported currencies, both fiat and crypto.';

-- `profiles` table
-- Stores user-specific application settings.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_currency VARCHAR(10) NOT NULL REFERENCES currencies(code)
);
COMMENT ON TABLE "profiles" IS 'Stores user-specific settings and is linked one-to-one with auth.users.';

-- `exchange_rates` table
-- Stores historical exchange rates for currency conversion.
CREATE TABLE exchange_rates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency_code VARCHAR(10) NOT NULL REFERENCES currencies(code),
    to_currency_code VARCHAR(10) NOT NULL REFERENCES currencies(code),
    rate NUMERIC NOT NULL,
    UNIQUE(date, from_currency_code, to_currency_code)
);
COMMENT ON TABLE "exchange_rates" IS 'Stores historical exchange rates for currency conversions.';

-- `accounts` table
-- Represents the real-world locations where assets are held.
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type account_type NOT NULL
);
COMMENT ON TABLE "accounts" IS 'Represents the different places where assets are held (e.g., brokerage, bank).';

-- `assets` table
-- A master list of all assets that can be invested in.
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    asset_class asset_class NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT NOT NULL,
    currency_code VARCHAR(10) NOT NULL REFERENCES currencies(code),
    UNIQUE(user_id, ticker)
);
COMMENT ON TABLE "assets" IS 'A master list of all investable assets (e.g., HPG stock, Bitcoin).';

-- `debts` table
-- Tracks money borrowed to invest.
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lender_name TEXT NOT NULL,
    principal_amount NUMERIC NOT NULL,
    currency_code VARCHAR(10) NOT NULL REFERENCES currencies(code),
    interest_rate NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    status debt_status NOT NULL
);
COMMENT ON TABLE "debts" IS 'Tracks money borrowed to invest, keeping it separate from assets.';

-- `transactions` table
-- Represents a single financial event (e.g., "Buy HPG Stock").
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_date TIMESTAMPTZ NOT NULL,
    type transaction_type NOT NULL,
    description TEXT,
    related_debt_id UUID REFERENCES debts(id) ON DELETE SET NULL
);
COMMENT ON TABLE "transactions" IS 'Represents a single financial event, like a trade or a deposit.';

-- `transaction_details` table
-- Stores specific data for buy/sell trades.
CREATE TABLE transaction_details (
    transaction_id UUID PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    fees NUMERIC NOT NULL DEFAULT 0,
    taxes NUMERIC NOT NULL DEFAULT 0
);
COMMENT ON TABLE "transaction_details" IS 'Stores specific data for buy/sell trades, like price, fees, and taxes.';

-- `transaction_legs` table
-- Represents the asset movements that make up a transaction (double-entry system).
CREATE TABLE transaction_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    quantity NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    currency_code VARCHAR(10) NOT NULL REFERENCES currencies(code)
);
COMMENT ON TABLE "transaction_legs" IS 'The individual asset movements that compose a transaction.';

-- Step 3: Enable Row Level Security (RLS)
-- A crucial security step for multi-tenant applications.
-- This ensures users can only access their own data.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_legs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- These policies define the rules for data access.

-- Profiles: Users can only manage their own profile.
CREATE POLICY "Users can manage their own profile"
ON profiles FOR ALL
USING (auth.uid() = id);

-- Currencies: For now, let's allow all authenticated users to read currencies.
-- You might tighten this later if needed.
CREATE POLICY "Authenticated users can read currencies"
ON currencies FOR SELECT
USING (auth.role() = 'authenticated');

-- Exchange Rates: Allow all authenticated users to read.
CREATE POLICY "Authenticated users can read exchange_rates"
ON exchange_rates FOR SELECT
USING (auth.role() = 'authenticated');

-- Accounts: Users can only manage their own accounts.
CREATE POLICY "Users can manage their own accounts"
ON accounts FOR ALL
USING (auth.uid() = user_id);

-- Assets: Users can only manage their own assets.
CREATE POLICY "Users can manage their own assets"
ON assets FOR ALL
USING (auth.uid() = user_id);

-- Debts: Users can only manage their own debts.
CREATE POLICY "Users can manage their own debts"
ON debts FOR ALL
USING (auth.uid() = user_id);

-- Transactions: Users can only manage their own transactions.
CREATE POLICY "Users can manage their own transactions"
ON transactions FOR ALL
USING (auth.uid() = user_id);

-- Transaction Details: Users can manage details for their own transactions.
CREATE POLICY "Users can manage details for their own transactions"
ON transaction_details FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM transactions WHERE id = transaction_id
  )
);

-- Transaction Legs: Users can only manage legs of their own transactions.
-- We check ownership through the parent transaction.
CREATE POLICY "Users can manage their own transaction_legs"
ON transaction_legs FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM transactions WHERE id = transaction_id
  )
);

-- Step 5: Add some initial data for currencies
INSERT INTO currencies (code, name, type) VALUES
('VND', 'Vietnamese Dong', 'fiat'),
('MYR', 'Malaysian Ringgit', 'fiat'),
('USD', 'United States Dollar', 'fiat'),
('USDT', 'Tether', 'crypto'),
('BTC', 'Bitcoin', 'crypto');