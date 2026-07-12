"use client"

import { createContext, use, useMemo } from "react"
import { useFlightsFilters } from "@flight/hooks/use-flights-filters"
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableName: "flights_summary" as any,
    columns: "*",
    pageSize: 12,
    schema: "flight",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trailingQuery: trailingQuery as any,
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
