CREATE POLICY "Authenticated users can insert into revalidation_queue"
ON public.revalidation_queue
FOR INSERT
TO authenticated
WITH CHECK (true);
