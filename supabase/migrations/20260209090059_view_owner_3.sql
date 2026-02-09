-- Grant SELECT to authenticated role
GRANT SELECT ON stock_annual_pnl TO authenticated;
GRANT SELECT ON yearly_snapshots TO authenticated;
GRANT SELECT ON monthly_snapshots TO authenticated;

-- Also grant to anon if needed
GRANT SELECT ON stock_annual_pnl TO anon;
GRANT SELECT ON yearly_snapshots TO anon;
GRANT SELECT ON monthly_snapshots TO anon;