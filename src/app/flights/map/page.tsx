import { getLifetimeStats } from "@/lib/server/flights-stats"
import { Suspense } from "react"
import FlightsMapClient from "./client"

export default function FlightsMapPage() {
  return (
    <Suspense fallback={<p>Loading flight data...</p>}>
      <FlightsMapPageContent />
    </Suspense>
  )
}

async function FlightsMapPageContent() {
  const stats = await getLifetimeStats()
  return <FlightsMapClient stats={stats} />
}
