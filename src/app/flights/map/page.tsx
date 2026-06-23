import { getLifetimeStats } from "@/features/flights/actions/get-lifetime-stats"
import { getRoutesGeoJSON } from "@/features/flights/actions/get-geojson-routes"
import { getAirports } from "@/features/flights/actions/get-airports"
import { Suspense } from "react"
import FlightsMapClient from "../../../features/flights/components/flight-map"

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
