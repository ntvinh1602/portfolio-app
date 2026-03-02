import { FlightsList } from "./components/flightsList"
import { StatsOverview } from "./components/statsOverview"

export default function FlightsPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Flight History
          </h1>
          <p className="text-muted-foreground mt-2">
            Your personal flight diary and travel statistics.
          </p>
        </div>

        <StatsOverview />

        <FlightsList />
      </div>
    </div>
  )
}