-- 0002_add_equity_liability_asset_class.sql
-- This script updates the asset_class enum to include 'equity' and 'liability'.
-- This change is crucial for properly implementing a full double-entry accounting system,
-- allowing the schema to correctly handle transactions related to income, expenses, and debts.

-- Supabase does not support transactional DDL changes for enums within a single transaction.
-- Each ALTER TYPE command must be run separately.

-- Add 'equity' to the asset_class enum
ALTER TYPE asset_class ADD VALUE 'equity';

-- Add 'liability' to the asset_class enum
ALTER TYPE asset_class ADD VALUE 'liability';