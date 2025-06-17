-- 0005_add_conceptual_account_type.sql
-- This script updates the account_type enum to include 'conceptual'.
-- This is to support abstract accounts required for double-entry accounting,
-- such as an 'Income' or 'Equity' account that does not correspond to a real-world bank or brokerage.

ALTER TYPE account_type ADD VALUE 'conceptual';