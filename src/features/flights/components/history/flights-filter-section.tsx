"use client"

import { useFlightsData } from "./flights-data-context"
import { FlightFilter } from "./flight-filter"

export function FlightsFilterSection() {
  const {
    state: { filters },
    actions: { setFilters },
    options: { airlineFilterOptions, startYear },
  } = useFlightsData()

  return (
    <FlightFilter
      filters={filters}
      onFiltersChange={setFilters}
      airlineOptions={airlineFilterOptions}
      startYear={startYear}
    />
  )
}
