"use client"

import { useCallback } from "react"
import { InfiniteList } from "@/components/infinite-list"
import { FlightItem } from "./flight-item"
import { ItemGroup, ItemTitle } from "@/components/ui/item"
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
      <ItemGroup className="gap-2">
        <ItemTitle className="pb-2">Found {data.length} flights</ItemTitle>
        {data.map((flight, i) => (
          <FlightItem
            key={`${flight.flight_number}-${flight.departure_time}-${i}`}
            flight={flight}
            index={i}
          />
        ))}
      </ItemGroup>
    </InfiniteList>
  )
}
