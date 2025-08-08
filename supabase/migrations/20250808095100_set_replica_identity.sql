-- supabase/migrations/20250808095100_set_replica_identity.sql

-- Set the REPLICA IDENTITY for the live_stock_prices table
ALTER TABLE public.live_stock_prices REPLICA IDENTITY FULL;