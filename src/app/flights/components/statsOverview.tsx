export function StatsOverview() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Flights" value="42" />
      <StatCard title="Total Distance" value="128,540 km" />
      <StatCard title="Airports Visited" value="31" />
      <StatCard title="Countries Visited" value="12" />
    </div>
  )
}

function StatCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}