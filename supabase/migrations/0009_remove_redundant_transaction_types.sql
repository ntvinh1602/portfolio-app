-- 1. Decouple tax_lots.origin from the enum by changing its type to text
ALTER TABLE public.tax_lots
ALTER COLUMN origin TYPE text;

-- 2. Now, perform the original migration for transactions.type
-- Rename the old enum to a temporary name
ALTER TYPE public.transaction_type RENAME TO transaction_type_old;

-- Create the new enum with the correct values
CREATE TYPE public.transaction_type AS ENUM (
    'buy',
    'sell',
    'deposit',
    'withdraw',
    'expense',
    'income',
    'dividend',
    'debt_payment',
    'split',
    'borrow'
);

-- Update the transactions.type column to use the new enum
ALTER TABLE public.transactions
ALTER COLUMN type TYPE public.transaction_type
USING type::text::public.transaction_type;

-- Drop the old transaction_type enum
DROP TYPE public.transaction_type_old;

-- 3. Create a dedicated enum for tax lot origins
CREATE TYPE public.tax_lot_origin AS ENUM (
    'purchase',
    'split'
);

-- 4. Convert the tax_lots.origin column to use the new dedicated enum, mapping 'buy' to 'purchase'
ALTER TABLE public.tax_lots
ALTER COLUMN origin TYPE public.tax_lot_origin
USING
    CASE
        WHEN origin = 'buy' THEN 'purchase'::public.tax_lot_origin
        ELSE origin::public.tax_lot_origin
    END;