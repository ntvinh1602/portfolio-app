ALTER TABLE public.transactions
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
