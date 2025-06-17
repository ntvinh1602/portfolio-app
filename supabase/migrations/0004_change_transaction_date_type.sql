-- 0004_change_transaction_date_type.sql
-- This script changes the data type of the transaction_date column
-- in the transactions table from TIMESTAMPTZ to DATE.

ALTER TABLE public.transactions
ALTER COLUMN transaction_date TYPE DATE
USING (transaction_date::date);