ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logged in users can access monthly snapshots"
ON monthly_snapshots
TO authenticated
USING (true);