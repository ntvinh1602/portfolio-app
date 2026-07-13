import { Suspense } from "react"
import { FlightsDataProvider } from "@flight/components/history/flights-data-context"
import { FlightsOptionsProvider } from "@flight/components/history/flights-options-context"
import { FlightsHistory } from "@flight/components/history/flights-history"
import getAirlines from "@flight/actions/get-airlines"
import getAircrafts from "@flight/actions/get-aircrafts"
import getAirports from "@flight/actions/get-airports"
import { Spinner } from "@/components/ui/spinner"

const historyFallback = <Spinner />
const FLIGHTS_START_YEAR = 2019

export default function FlightsHistoryPage() {
  return (
    <Suspense fallback={historyFallback}>
      <FlightsHistoryData />
    </Suspense>
  )
}

async function FlightsHistoryData() {
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

  // Compute form options (value = string id for form field compatibility)
  const airlineFormOptions = airlines.map((a) => ({
    label: a.name,
    value: String(a.id),
  }))

  const aircraftFormOptions = aircrafts.map((a) => ({
    label: a.model ? `${a.icao_code} — ${a.model}` : a.icao_code,
    value: String(a.id),
  }))

  const airportFormOptions = airports.map((a) => ({
    label: `${a.iata_code} — ${a.name}`,
    value: String(a.id),
  }))

  return (
    <FlightsOptionsProvider
      airlineFilterOptions={airlineFilterOptions}
      startYear={FLIGHTS_START_YEAR}
      airlineFormOptions={airlineFormOptions}
      aircraftFormOptions={aircraftFormOptions}
      airportFormOptions={airportFormOptions}
    >
      <FlightsDataProvider>
        <FlightsHistory />
      </FlightsDataProvider>
    </FlightsOptionsProvider>
  )
}
