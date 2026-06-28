import "leaflet/dist/leaflet.css"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import getLifetimeStats from "@flight/actions/get-lifetime-stats"
import getRoutesGeoJSON from "@flight/actions/get-geojson-routes"
import getAirports from "@flight/actions/get-airports"
import StatsCarousel from "@flight/components/map/stats-carousel"
import LeafletMapDynamic from "@flight/components/map/wrapper"

export default function FlightsMapPage() {
  return (
    <div className="flex flex-col h-full gap-6 px-4 pb-4">
      <Suspense fallback={<Spinner />}>
        <StatsCarouselData />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <MapData />
      </Suspense>
    </div>
  )
}

async function StatsCarouselData() {
  const stats = await getLifetimeStats()
  return <StatsCarousel stats={stats} />
}

async function MapData() {
  const [routes, airports] = await Promise.all([
    getRoutesGeoJSON(),
    getAirports(),
  ])
  return (
    <div className="relative h-full rounded-2xl overflow-hidden isolate">
      <LeafletMapDynamic routes={routes} airports={airports} />
    </div>
  )
}
