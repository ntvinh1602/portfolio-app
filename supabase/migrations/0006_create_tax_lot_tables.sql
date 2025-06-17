-- 0006_create_tax_lot_tables.sql
-- This migration introduces tables for FIFO cost basis tracking and handles stock splits.

-- Step 1: Add 'split' to the transaction_type enum
-- Note: Assumes the ENUM type for transactions.type is named 'transaction_type'.
-- This is a non-transactional operation in older Postgres versions, handle with care.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'split';

-- Step 2: Create the tax_lots table
-- This table will store individual acquisition lots for assets.
CREATE TABLE public.tax_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    creation_transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    origin transaction_type NOT NULL,
    creation_date date NOT NULL,
    original_quantity numeric NOT NULL CHECK (original_quantity > 0),
    cost_basis numeric NOT NULL CHECK (cost_basis >= 0),
    remaining_quantity numeric NOT NULL CHECK (remaining_quantity >= 0)
);

-- Add comments to the new table and columns
COMMENT ON TABLE public.tax_lots IS 'Stores individual acquisition lots for assets to enable FIFO cost basis tracking.';
COMMENT ON COLUMN public.tax_lots.origin IS 'The type of transaction that created the lot (e.g., ''buy'', ''split''). Reuses the transaction_type enum.';
COMMENT ON COLUMN public.tax_lots.remaining_quantity IS 'The quantity of the asset remaining in this lot. Updated upon sale.';

-- Step 3: Create the lot_consumptions table
-- This table links sales transaction legs to the specific tax lots they consumed.
CREATE TABLE public.lot_consumptions (
    sell_transaction_leg_id uuid NOT NULL REFERENCES public.transaction_legs(id) ON DELETE CASCADE,
    tax_lot_id uuid NOT NULL REFERENCES public.tax_lots(id) ON DELETE RESTRICT,
    quantity_consumed numeric NOT NULL CHECK (quantity_consumed > 0),
    PRIMARY KEY (sell_transaction_leg_id, tax_lot_id)
);

-- Add comments to the new table and columns
COMMENT ON TABLE public.lot_consumptions IS 'Creates an immutable link between a sale and the specific tax lots it consumed.';
COMMENT ON COLUMN public.lot_consumptions.tax_lot_id IS 'The tax lot that was consumed from.';
COMMENT ON COLUMN public.lot_consumptions.quantity_consumed IS 'The number of shares consumed from this lot in a specific sale.';


-- Step 4: Enable Row Level Security (RLS) and define optimized policies
-- Ensures users can only access their own data, following the established performance pattern.

-- RLS for tax_lots
ALTER TABLE public.tax_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tax lots"
    ON public.tax_lots
    FOR ALL
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- RLS for lot_consumptions
-- This policy ensures a user can only manage consumptions linked to lots they own.
ALTER TABLE public.lot_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lot consumptions"
    ON public.lot_consumptions
    FOR ALL
    USING ((select auth.uid()) = (SELECT user_id FROM public.tax_lots WHERE id = lot_consumptions.tax_lot_id))
    WITH CHECK ((select auth.uid()) = (SELECT user_id FROM public.tax_lots WHERE id = lot_consumptions.tax_lot_id));