import { getLifetimeStats } from "@/lib/server/flights-stats"
import { getRoutesGeoJSON } from "@/lib/server/flights-routes"
import { getAirports } from "@/lib/server/flights-airports"
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
  const [stats, routes, airports] = await Promise.all([
    getLifetimeStats(),
    getRoutesGeoJSON(),
    getAirports(),
  ])

  return (
    <FlightsMapClient stats={stats} routes={routes} airports={airports} />
  )
}
