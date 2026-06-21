"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { subMonths, startOfDay, endOfDay } from "date-fns"
import type { TransactionFilterState, Preset } from "../txn-filter"

function getDateRangeFromPreset(preset: Preset, now: Date) {
  switch (preset) {
    case "1M":
      return { startDate: subMonths(now, 1), endDate: now }
    case "3M":
      return { startDate: subMonths(now, 3), endDate: now }
    case "6M":
      return { startDate: subMonths(now, 6), endDate: now }
    case "1Y":
      return { startDate: subMonths(now, 12), endDate: now }
    default:
      return { startDate: subMonths(now, 3), endDate: now }
  }
}

interface UseTransactionFiltersOptions {
  defaultPreset?: Preset
}

export function useTransactionFilters(options?: UseTransactionFiltersOptions) {
  const defaultPreset: Preset = options?.defaultPreset ?? "3M"

  // Defer Date.now()/new Date() to useEffect — cacheComponents requires
  // deterministic values during server render.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  const [preset, setPreset] = useState<Preset>(defaultPreset)
  const [customRange, setCustomRange] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)
  const [filters, setFilters] = useState<TransactionFilterState>({
    categories: [],
    operation: null,
    search: "",
  })
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Once the client clock is available, initialise the date range
  useEffect(() => {
    if (now && !customRange) {
      setCustomRange(getDateRangeFromPreset(defaultPreset, now))
    }
  }, [now, customRange])

  // Fallback range used during SSR — the real range kicks in after hydration
  // and the useInfiniteQuery store is recreated via trailingQueryKey change.
  const fallbackRange = { startDate: new Date(0), endDate: new Date(0) }
  const dateRange = useMemo(() => {
    if (!customRange) return fallbackRange
    if (preset === "CUSTOM") return customRange
    return getDateRangeFromPreset(preset, now ?? new Date())
  }, [preset, customRange, now])

  const startISO = useMemo(
    () => startOfDay(dateRange.startDate).toISOString(),
    [dateRange.startDate],
  )
  const endISO = useMemo(
    () => endOfDay(dateRange.endDate).toISOString(),
    [dateRange.endDate],
  )

  // Build a trailing query that applies date range and all active filters
  const trailingQuery = useCallback(
    (query: any) => {
      query = query
        .gte("created_at", startISO)
        .lte("created_at", endISO)

      if (filters.categories.length > 0) {
        query = query.in("category", filters.categories)
      }
      if (filters.operation) {
        query = query.eq("operation", filters.operation)
      }
      if (filters.search) {
        query = query.ilike("memo", `%${filters.search}%`)
      }

      return query.order("created_at", { ascending: false })
    },
    [startISO, endISO, filters],
  )

  // When the trailing query shape changes, the store is recreated
  const trailingQueryKey = useMemo(
    () =>
      JSON.stringify({
        startISO,
        endISO,
        categories: filters.categories,
        operation: filters.operation,
        search: filters.search,
        refreshCounter,
      }),
    [startISO, endISO, filters, refreshCounter],
  )

  const onCustomStartDateChange = useCallback(
    (date: Date | undefined) => {
      setCustomRange((prev) => {
        const base = prev ?? {
          startDate: new Date(0),
          endDate: new Date(0),
        }
        return { ...base, startDate: date ?? base.startDate }
      })
    },
    [],
  )

  const onCustomEndDateChange = useCallback(
    (date: Date | undefined) => {
      setCustomRange((prev) => {
        const base = prev ?? {
          startDate: new Date(0),
          endDate: new Date(0),
        }
        return { ...base, endDate: date ?? base.endDate }
      })
    },
    [],
  )

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((c) => c + 1)
  }, [])

  return {
    // Date range — consumed by TxnFilter
    preset,
    setPreset,
    customStartDate: customRange?.startDate ?? new Date(0),
    customEndDate: customRange?.endDate ?? new Date(0),
    onCustomStartDateChange,
    onCustomEndDateChange,
    // Filters — consumed by TxnFilter
    filters,
    setFilters,
    // Query — consumed by useInfiniteQuery
    trailingQuery,
    trailingQueryKey,
    // Refresh — consumed by form onSuccess
    triggerRefresh,
  }
}
