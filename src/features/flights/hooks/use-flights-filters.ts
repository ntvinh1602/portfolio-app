"use client"

import { useState, useMemo, useCallback } from "react"
import type { FilterState } from "@flight/flight.types"
import type { SupabaseQueryHandler } from "@/hooks/use-infinite-query"

const EMPTY_FILTERS: FilterState = {
  year: null,
  airline: null,
  ticketClass: "eco",
  search: "",
}

export function useFlightsFilters() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Build a trailing query that applies all active filters
  const trailingQuery = useCallback<
    SupabaseQueryHandler<"flights_summary", "flight">
  >(
    (query) => {
      if (filters.year) {
        query = query
          .gte("departure_time", `${filters.year}-01-01`)
          .lte("departure_time", `${filters.year}-12-31`)
      }
      if (filters.airline) {
        query = query.eq("airline_name", filters.airline)
      }
      query = query.eq("ticket_class", filters.ticketClass)
      if (filters.search) {
        query = query.ilike("flight_number", `%${filters.search}%`)
      }
      return query.order("departure_time", { ascending: false })
    },
    [filters],
  )

  // When the trailing query shape changes, the store is recreated
  const trailingQueryKey = useMemo(
    () =>
      JSON.stringify({
        year: filters.year,
        airline: filters.airline,
        ticketClass: filters.ticketClass,
        search: filters.search,
        refreshCounter,
      }),
    [filters, refreshCounter],
  )

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((c) => c + 1)
  }, [])

  return {
    filters,
    setFilters,
    trailingQuery,
    trailingQueryKey,
    triggerRefresh,
  }
}
