"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "./form/flightsForm"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { FlightItem, type Flight } from "./flight-item"
import { InfiniteList } from "@/components/infinite-list"
import { FlightFilter, type FilterState } from "./flight-filter"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { ListFilter, PlusIcon } from "lucide-react"
import { ItemGroup } from "@/components/ui/item"

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
  const [refreshCounter, setRefreshCounter] = useState(0)
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

  // When the trailing query shape or refresh counter changes, the store is recreated
  const trailingQueryKey = useMemo(
    () =>
      JSON.stringify({
        year: filters.year,
        airline: filters.airline,
        seatTypes: filters.seatTypes,
        search: filters.search,
        refreshCounter,
      }),
    [filters, refreshCounter]
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
    setRefreshCounter((c) => c + 1)
  }, [])

  const renderEndMessage = useCallback(
    (total: number) => (
      <p className="text-sm text-muted-foreground">
        You&apos;ve reached the end — all {total} flights loaded.
      </p>
    ),
    []
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="flex flex-col 2xl:flex-row gap-4 px-4 mx-auto">

        {/* Header + filters */}
        <Card className="h-fit w-fit mx-auto">
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardAction>
              <ListFilter className="stroke-1"/>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FlightFilter
              filters={filters}
              onFiltersChange={setFilters}
              airlineOptions={airlineOptions}
              availableYears={availableYears}
            />
          </CardContent>
        </Card>

        {/* Infinite card list */}
        <Card className="max-w-200">
          <CardHeader>
            <CardTitle>Flights List</CardTitle>
            <CardDescription>
              {isSuccess
                ? `${count} flight${count !== 1 ? "s" : ""} found`
                : "Loading..."}
            </CardDescription>
            <CardAction>
              <Button onClick={() => setOpen(true)} className="rounded-2xl">
                <PlusIcon/>Add Flight
              </Button>
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
            </CardAction>
          </CardHeader>
          <CardContent>
            <InfiniteList
              hasMore={hasMore}
              isFetching={isFetching}
              isLoading={isLoading}
              count={count}
              fetchNextPage={fetchNextPage}
              renderEndMessage={renderEndMessage}
            >
              <div
                className="grid gap-2"
                style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" } as React.CSSProperties}
              >
                <ItemGroup>
                  {flights.map((flight, i) => (
                    <FlightItem
                      key={`${flight.flight_number}-${flight.departure_time}-${i}`}
                      flight={flight}
                      airportNames={airportNames}
                    />
                  ))}
                </ItemGroup>
              </div>
            </InfiniteList>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
