ALTER TABLE public.transaction_legs
ALTER COLUMN quantity TYPE NUMERIC(20,8);

ALTER TABLE public.lot_consumptions
ALTER COLUMN quantity_consumed TYPE NUMERIC(20,8);

ALTER TABLE public.tax_lots
ALTER COLUMN original_quantity TYPE NUMERIC(20,8);

ALTER TABLE public.tax_lots
ALTER COLUMN remaining_quantity TYPE NUMERIC(20,8);
