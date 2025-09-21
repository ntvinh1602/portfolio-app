-- 1. Rename the old enum type
ALTER TYPE transaction_type RENAME TO transaction_type_old;

-- 2. Create a new enum type with only the values you want
CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'deposit', 'withdraw', 'income', 'expense', 'borrow', 'repay', 'split');

-- 3. Alter all columns using the old type to use the new one
ALTER TABLE public.transactions
  ALTER COLUMN type TYPE transaction_type
  USING type::text::transaction_type;

-- 4. Drop the old type (if nothing depends on it anymore)
DROP TYPE transaction_type_old;
