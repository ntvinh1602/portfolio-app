-- Enable Row Level Security on the daily_market_indices table
ALTER TABLE public.daily_market_indices ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access to all authenticated users
CREATE POLICY "Allow read access to authenticated users"
ON public.daily_market_indices
FOR SELECT
TO authenticated
USING (true);