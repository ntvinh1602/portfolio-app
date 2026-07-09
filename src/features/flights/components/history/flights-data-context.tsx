"use client"

import { createContext, use } from "react"
import { useFlightsFilters } from "@flight/hooks/use-flights-filters"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import type { Flight } from "./flight-item"

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
  options: {
    airlineFilterOptions: { label: string; value: string }[]
    startYear: number
    airlineFormOptions: { label: string; value: string }[]
    aircraftFormOptions: { label: string; value: string }[]
    airportFormOptions: { label: string; value: string }[]
  }
}

const FlightsDataContext = createContext<FlightsDataContextValue | null>(null)

export function FlightsDataProvider({
  children,
  airlineFilterOptions,
  startYear,
  airlineFormOptions,
  aircraftFormOptions,
  airportFormOptions,
}: {
  children: React.ReactNode
  airlineFilterOptions: { label: string; value: string }[]
  startYear: number
  airlineFormOptions: { label: string; value: string }[]
  aircraftFormOptions: { label: string; value: string }[]
  airportFormOptions: { label: string; value: string }[]
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
    tableName: "flights_readable" as any,
    columns: "*",
    pageSize: 12,
    schema: "flight",
    trailingQuery,
    trailingQueryKey,
  })

  return (
    <FlightsDataContext.Provider
      value={{
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
        options: {
          airlineFilterOptions,
          startYear,
          airlineFormOptions,
          aircraftFormOptions,
          airportFormOptions,
        },
      }}
    >
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
