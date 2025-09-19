-- 1. Rename the old enum type
ALTER TYPE asset_class RENAME TO asset_class_old;

-- 2. Create a new enum type with only the values you want
CREATE TYPE asset_class AS ENUM ('cash', 'stock', 'crypto', 'fund', 'equity', 'liability', 'index');

-- 3. Alter all columns using the old type to use the new one
ALTER TABLE public.assets
  ALTER COLUMN asset_class TYPE asset_class
  USING asset_class::text::asset_class;

-- 4. Drop the old type (if nothing depends on it anymore)
DROP TYPE asset_class_old;
