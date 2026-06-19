CREATE POLICY "Allow authenticated read access to airlines bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'airlines');
