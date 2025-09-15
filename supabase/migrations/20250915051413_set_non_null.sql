ALTER TABLE public.monthly_snapshots
ALTER COLUMN pnl SET NOT NULL;
ALTER TABLE public.monthly_snapshots
ALTER COLUMN interest SET NOT NULL;
ALTER TABLE public.monthly_snapshots
ALTER COLUMN tax SET NOT NULL;
ALTER TABLE public.monthly_snapshots
ALTER COLUMN fee SET NOT NULL;
