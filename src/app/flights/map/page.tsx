import MapClient from "./map-client"
import { getFlightsGeoJSON } from "@/lib/flights/getFlightGeoJSON"

export default async function FlightsPage() {
  const geojson = await getFlightsGeoJSON()

  return (
    <MapClient data={geojson} />
  )
}