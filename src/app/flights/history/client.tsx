"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "./form/flightsForm"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { FlightItem, type Flight } from "./flight-item"
import { InfiniteList } from "@/components/infinite-list"
import { FlightFilter } from "./flight-filter"
import { useFlightsFilters } from "./hooks/use-flights-filters"
import { useFlightReferenceData } from "./hooks/use-flight-reference-data"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ListFilter, PlusIcon } from "lucide-react"
import { ItemGroup } from "@/components/ui/item"

export default function FlightsCardsClient() {
  const {
    filters,
    setFilters,
    trailingQuery,
    trailingQueryKey,
    triggerRefresh,
  } = useFlightsFilters()

  const { airlines } = useFlightReferenceData()

  const [open, setOpen] = useState(false)

  // Defer new Date() to useEffect — Cache Components requires deterministic
  // values during server render.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  const airlineOptions = useMemo(
    () => airlines.map((a) => ({ label: a.name, value: a.name })),
    [airlines],
  )

  const availableYears = useMemo(() => {
    if (!now) return []
    const currentYear = now.getFullYear()
    const years: string[] = []
    for (let y = currentYear; y >= currentYear - 10; y--) {
      years.push(String(y))
    }
    return years
  }, [now])

  const {
    data: flights,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
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

  const renderEndMessage = useCallback(
    (total: number) => (
      <p className="text-sm text-muted-foreground">
        You have reached the end — all {total} flights loaded.
      </p>
    ),
    [],
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="flex flex-col xl:flex-row gap-4 px-4 mx-auto">
        {/* Header + filters */}
        <Card className="h-fit w-fit mx-auto">
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardAction>
              <ListFilter className="stroke-1" />
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
        <Card className="max-w-140">
          <CardHeader>
            <CardTitle>Flights List</CardTitle>
            <CardDescription>
              {isSuccess
                ? `${count} flight${count !== 1 ? "s" : ""} found`
                : "Loading..."}
            </CardDescription>
            <CardAction>
              <Button onClick={() => setOpen(true)} className="rounded-2xl">
                <PlusIcon />
                Add Flight
              </Button>
              <FormDialogWrapper
                open={open}
                onOpenChange={setOpen}
                title="Add Flight"
                subtitle="Log a new flight into your travel history"
                onSuccess={triggerRefresh}
                FormComponent={(props: { onSuccess?: () => void }) => (
                  <FlightForm {...props} />
                )}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* Error banner */}
            {error && (
              <div className="text-sm text-destructive mb-4">
                Error fetching flights: {error.message}
              </div>
            )}

            <InfiniteList
              hasMore={hasMore}
              isFetching={isFetching}
              isLoading={isLoading}
              count={count}
              fetchNextPage={fetchNextPage}
              renderEndMessage={renderEndMessage}
            >
              <div className="grid gap-2 [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
                <ItemGroup>
                  {flights.map((flight, i) => (
                    <FlightItem
                      key={`${flight.flight_number}-${flight.departure_time}-${i}`}
                      flight={flight}
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
