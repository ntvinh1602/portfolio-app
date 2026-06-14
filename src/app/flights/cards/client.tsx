"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "@/app/flights/form/flightsForm"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { FlightCard, type Flight } from "./flight-card"
import { InfiniteList } from "./infinite-list"
import { FilterBar, type FilterState } from "./filter-bar"

interface FlightsCardsClientProps {
  airlines: { id: string; name: string }[]
  aircrafts: { id: string; icao_code: string; model?: string | null }[]
  airports: { id: string; iata_code: string; name: string }[]
  earliestYear: number
}

function buildYears(earliestYear: number): string[] {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(String(y))
  }
  return years
}

export default function FlightsCardsClient({
  airlines,
  aircrafts,
  airports,
  earliestYear,
}: FlightsCardsClientProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    year: null,
    airline: null,
    seatTypes: [],
    search: "",
  })

  const airlineOptions = useMemo(
    () => airlines.map((a) => ({ label: a.name, value: a.name })),
    [airlines]
  )

  const airportNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of airports) {
      map.set(a.iata_code, a.name)
    }
    return map
  }, [airports])

  const availableYears = useMemo(() => buildYears(earliestYear), [earliestYear])

  // Build a trailing query that applies all active filters
  const trailingQuery = useCallback(
    (query: any) => {
      if (filters.year) {
        query = query
          .gte("departure_time", `${filters.year}-01-01`)
          .lte("departure_time", `${filters.year}-12-31`)
      }
      if (filters.airline) {
        query = query.eq("airline_name", filters.airline)
      }
      if (filters.seatTypes.length > 0) {
        query = query.in("seat_type", filters.seatTypes)
      }
      if (filters.search) {
        query = query.ilike("flight_number", `%${filters.search}%`)
      }
      return query.order("departure_time", { ascending: false })
    },
    [filters]
  )

  // When the trailing query shape changes, the store is recreated
  const trailingQueryKey = useMemo(
    () =>
      JSON.stringify({
        year: filters.year,
        airline: filters.airline,
        seatTypes: filters.seatTypes,
        search: filters.search,
      }),
    [filters]
  )

  const {
    data: flights,
    count,
    isSuccess,
    isLoading,
    isFetching,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery<Flight>({
    tableName: "flights_readable" as any,
    columns: "*",
    pageSize: 12,
    schema: "flight",
    trailingQuery,
    trailingQueryKey,
  })

  const handleFlightAdded = useCallback(() => {
    router.refresh()
  }, [router])

  const renderEndMessage = useCallback(
    (total: number) => (
      <p className="text-sm text-muted-foreground">
        You&apos;ve reached the end — all {total} flights loaded.
      </p>
    ),
    []
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header + filters */}
      <div className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Flight History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuccess
                ? `${count} flight${count !== 1 ? "s" : ""} found`
                : "Loading..."}
            </p>
          </div>

          <Button onClick={() => setOpen(true)} className="rounded-2xl">
            Add Flight
          </Button>
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          airlineOptions={airlineOptions}
          availableYears={availableYears}
        />
      </div>

      {/* Form dialog */}
      <FormDialogWrapper
        open={open}
        onOpenChange={setOpen}
        title="Add Flight"
        subtitle="Log a new flight into your travel history"
        onSuccess={handleFlightAdded}
        FormComponent={(props: { onSuccess?: () => void }) => (
          <FlightForm
            {...props}
            airlines={airlines}
            aircrafts={aircrafts}
            airports={airports}
          />
        )}
      />

      {/* Infinite card list */}
      <InfiniteList
        hasMore={hasMore}
        isFetching={isFetching}
        isLoading={isLoading}
        count={count}
        fetchNextPage={fetchNextPage}
        renderEndMessage={renderEndMessage}
      >
        <div className="grid gap-4">
          {flights.map((flight, i) => (
            <FlightCard
              key={`${flight.flight_number}-${flight.departure_time}-${i}`}
              flight={flight}
              airportNames={airportNames}
            />
          ))}
        </div>
      </InfiniteList>
    </div>
  )
}
