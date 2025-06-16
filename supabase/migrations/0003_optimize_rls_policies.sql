-- 0003_optimize_rls_policies.sql
-- This script updates the existing Row Level Security (RLS) policies to improve performance.
-- It replaces direct calls to auth.uid() and auth.role() with (select auth.uid())
-- and (select auth.role()) respectively. This ensures the function is called only once
-- per query, rather than once per row, resolving Supabase performance warnings.

-- Update policy for profiles
ALTER POLICY "Users can manage their own profile"
ON public.profiles
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Update policy for currencies
ALTER POLICY "Authenticated users can read currencies"
ON public.currencies
USING ((select auth.role()) = 'authenticated');

-- Update policy for exchange_rates
ALTER POLICY "Authenticated users can read exchange_rates"
ON public.exchange_rates
USING ((select auth.role()) = 'authenticated');

-- Update policy for accounts
ALTER POLICY "Users can manage their own accounts"
ON public.accounts
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Update policy for assets
ALTER POLICY "Users can manage their own assets"
ON public.assets
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Update policy for debts
ALTER POLICY "Users can manage their own debts"
ON public.debts
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Update policy for transactions
ALTER POLICY "Users can manage their own transactions"
ON public.transactions
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Update policy for transaction_details
ALTER POLICY "Users can manage details for their own transactions"
ON public.transaction_details
USING ((select auth.uid()) = (SELECT user_id FROM transactions WHERE id = transaction_id))
WITH CHECK ((select auth.uid()) = (SELECT user_id FROM transactions WHERE id = transaction_id));

-- Update policy for transaction_legs
ALTER POLICY "Users can manage their own transaction_legs"
ON public.transaction_legs
USING ((select auth.uid()) = (SELECT user_id FROM transactions WHERE id = transaction_id))
WITH CHECK ((select auth.uid()) = (SELECT user_id FROM transactions WHERE id = transaction_id));