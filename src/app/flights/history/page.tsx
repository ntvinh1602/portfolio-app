import getAirlines from "@flight/actions/get-airlines"
import getAircrafts from "@flight/actions/get-aircrafts"
import getAirports from "@flight/actions/get-airports"
import FlightsList from "@flight/components/flights-list"
import { Spinner } from "@/components/ui/spinner"
import { Suspense } from "react"

export default function FlightsHistoryPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FlightsListData />
    </Suspense>
  )
}

async function FlightsListData() {
  const [airlines, aircrafts, airports] = await Promise.all([
    getAirlines(),
    getAircrafts(),
    getAirports(),
  ])

  // Compute filter options (value = name for text-based filtering on readable view)
  const airlineFilterOptions = airlines.map((a) => ({
    label: a.name,
    value: a.name,
  }))

  // Compute available years from current year back 10 years
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 11 }, (_, i) =>
    String(currentYear - i),
  )

  // Compute form options (value = id for database references)
  const airlineFormOptions = airlines.map((a) => ({
    label: a.name,
    value: a.id,
  }))

  const aircraftFormOptions = aircrafts.map((a) => ({
    label: a.model ? `${a.icao_code} — ${a.model}` : a.icao_code,
    value: a.id,
  }))

  const airportFormOptions = airports.map((a) => ({
    label: `${a.iata_code} — ${a.name}`,
    value: a.id,
  }))

  return (
    <FlightsList
      airlineFilterOptions={airlineFilterOptions}
      availableYears={availableYears}
      airlineFormOptions={airlineFormOptions}
      aircraftFormOptions={aircraftFormOptions}
      airportFormOptions={airportFormOptions}
    />
  )
}
