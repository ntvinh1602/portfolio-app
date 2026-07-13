"use client"

import { createContext, use, useMemo } from "react"
import { useFlightsFilters } from "@flight/hooks/use-flights-filters"
import { useDeleteFlight } from "@flight/hooks/use-delete-flight"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import type { Flight } from "../ui/flight-item"

interface FlightsDataContextValue {
  state: {
    data: Flight[]
    count: number | undefined
    isSuccess: boolean
    isLoading: boolean
    isFetching: boolean
    error: Error | null
    hasMore: boolean
    filters: ReturnType<typeof useFlightsFilters>["filters"]
  }
  actions: {
    fetchNextPage: () => void
    deleteFlight: (flightId: string) => Promise<void>
    setFilters: ReturnType<typeof useFlightsFilters>["setFilters"]
    triggerRefresh: () => void
  }
  meta: {
    trailingQueryKey: string
  }
}

const FlightsDataContext = createContext<FlightsDataContextValue | null>(null)

export function FlightsDataProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    filters,
    setFilters,
    trailingQuery,
    trailingQueryKey,
    triggerRefresh,
  } = useFlightsFilters()
  const deleteFlight = useDeleteFlight(triggerRefresh)

  const {
    data: flights,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery<Flight, "flight", "flights_summary">({
    tableName: "flights_summary",
    columns: "*",
    pageSize: 12,
    schema: "flight",
    trailingQuery,
    trailingQueryKey,
  })

  const value = useMemo<FlightsDataContextValue>(
    () => ({
      state: {
        data: flights,
        count,
        isSuccess,
        isLoading,
        isFetching,
        error,
        hasMore,
        filters,
      },
      actions: {
        fetchNextPage,
        deleteFlight,
        setFilters,
        triggerRefresh,
      },
      meta: {
        trailingQueryKey,
      },
    }),
    [
      flights,
      count,
      isSuccess,
      isLoading,
      isFetching,
      error,
      hasMore,
      filters,
      fetchNextPage,
      deleteFlight,
      setFilters,
      triggerRefresh,
      trailingQueryKey,
    ],
  )

  return (
    <FlightsDataContext.Provider value={value}>
      {children}
    </FlightsDataContext.Provider>
  )
}

export function useFlightsData() {
  const ctx = use(FlightsDataContext)
  if (!ctx) {
    throw new Error(
      "useFlightsData must be used within FlightsDataProvider",
    )
  }
  return ctx
}
