"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "@flight/form/flightsForm"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { FlightItem, type Flight } from "./flight-item"
import { InfiniteList } from "@/components/infinite-list"
import { FlightFilter } from "./flight-filter"
import { useFlightsFilters } from "@flight/hooks/use-flights-filters"
import { PlusIcon } from "lucide-react"
import { ItemGroup } from "@/components/ui/item"
import StatusLabel from "@/components/status-label"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface FlightsListProps {
  airlineFilterOptions: { label: string; value: string }[]
  startYear: number
  airlineFormOptions: { label: string; value: string }[]
  aircraftFormOptions: { label: string; value: string }[]
  airportFormOptions: { label: string; value: string }[]
}

export default function FlightsList({
  airlineFilterOptions,
  startYear,
  airlineFormOptions,
  aircraftFormOptions,
  airportFormOptions,
}: FlightsListProps) {
  const {
    filters,
    setFilters,
    trailingQuery,
    trailingQueryKey,
    triggerRefresh,
  } = useFlightsFilters()

  const [open, setOpen] = useState(false)

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
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col w-full xl:flex-row xl:max-w-250 gap-6 mx-auto">
        <FlightFilter
          filters={filters}
          onFiltersChange={setFilters}
          airlineOptions={airlineFilterOptions}
          startYear={startYear}
        />

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Flights List</CardTitle>
            <CardDescription>
              {isSuccess
                ? `${count} flight${count !== 1 ? "s" : ""}`
                : "Loading..."}
            </CardDescription>
            <CardAction>
              <Button onClick={() => setOpen(true)}>
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
                  <FlightForm
                    {...props}
                    airlineOptions={airlineFormOptions}
                    aircraftOptions={aircraftFormOptions}
                    airportOptions={airportFormOptions}
                  />
                )}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {error ? (
              <StatusLabel type="error" />
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
