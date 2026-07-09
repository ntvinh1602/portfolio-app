"use client"

import { useCallback } from "react"
import { InfiniteList } from "@/components/infinite-list"
import { FlightItem } from "./flight-item"
import { ItemGroup } from "@/components/ui/item"
import StatusLabel from "@/components/status-label"
import { useFlightsData } from "./flights-data-context"

export function FlightsListSection() {
  const {
    state: { data, count, isSuccess, isLoading, isFetching, error, hasMore },
    actions: { fetchNextPage },
  } = useFlightsData()

  const renderEndMessage = useCallback(
    (total: number) => (
      <p className="text-sm text-muted-foreground">
        You have reached the end — all {total} flights loaded.
      </p>
    ),
    [],
  )

  if (error) return <StatusLabel type="error" />

  return (
    <InfiniteList
      hasMore={hasMore}
      isFetching={isFetching}
      isLoading={isLoading}
      count={count ?? 0}
      fetchNextPage={fetchNextPage}
      renderEndMessage={renderEndMessage}
    >
      <div className="grid gap-2 [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
        <ItemGroup className="gap-2">
          <span>Found {data.length} flights</span>
          {data.map((flight, i) => (
            <FlightItem
              key={`${flight.flight_number}-${flight.departure_time}-${i}`}
              flight={flight}
            />
          ))}
        </ItemGroup>
      </div>
    </InfiniteList>
  )
}
