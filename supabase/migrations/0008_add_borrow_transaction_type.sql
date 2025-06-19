-- Add 'borrow' to the transaction_type enum
-- This new type will be used to track transactions where money is borrowed,
-- creating a corresponding entry in the 'debts' table.

ALTER TYPE public.transaction_type ADD VALUE 'borrow';