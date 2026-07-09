"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { subMonths, startOfDay, endOfDay } from "date-fns"
import { categoryOps } from "@fund/config"
import type {
  TransactionFilterState,
  Preset,
} from "@fund/components/transactions/tx-filter"

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

interface TxQueryBuilder {
  gte(column: string, value: string): this
  lte(column: string, value: string): this
  eq(column: string, value: string): this
  ilike(column: string, value: string): this
  order(column: string, opts: { ascending: boolean }): this
}

interface UseTransactionFiltersOptions {
  defaultPreset?: Preset
}

export function useTransactionFilters(options?: UseTransactionFiltersOptions) {
  const defaultPreset: Preset = options?.defaultPreset ?? "3M"

  const [preset, setPreset] = useState<Preset>(defaultPreset)
  const [customRange, setCustomRange] = useState<{
    startDate: Date
    endDate: Date
  }>(() => getDateRangeFromPreset(defaultPreset, new Date()))
  const [filters, setFilters] = useState<TransactionFilterState>({
    categories: "stock",
    operation: "all",
    search: "",
  })
  const [refreshCounter, setRefreshCounter] = useState(0)

  // When switching to CUSTOM, snapshot the previous preset's range
  const prevPresetRef = useRef(preset)
  useEffect(() => {
    if (preset === "CUSTOM" && prevPresetRef.current !== "CUSTOM") {
      setCustomRange(getDateRangeFromPreset(prevPresetRef.current, new Date()))
    }
    prevPresetRef.current = preset
  }, [preset])

  const dateRange = useMemo(() => {
    if (preset === "CUSTOM") return customRange
    return getDateRangeFromPreset(preset, new Date())
  }, [preset, customRange])

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
    (query: TxQueryBuilder) => {
      query = query.gte("created_at", startISO).lte("created_at", endISO)

      query = query.eq("category", filters.categories)
      if (filters.operation !== "all") {
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

  const onCustomStartDateChange = useCallback((date: Date | undefined) => {
    setCustomRange((prev) => {
      const base = prev ?? {
        startDate: new Date(0),
        endDate: new Date(0),
      }
      return { ...base, startDate: date ?? base.startDate }
    })
  }, [])

  const onCustomEndDateChange = useCallback((date: Date | undefined) => {
    setCustomRange((prev) => {
      const base = prev ?? {
        startDate: new Date(0),
        endDate: new Date(0),
      }
      return { ...base, endDate: date ?? base.endDate }
    })
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((c) => c + 1)
  }, [])

  return {
    // Date range — consumed by TxnFilter
    preset,
    setPreset,
    resolvedStartDate: dateRange.startDate,
    resolvedEndDate: dateRange.endDate,
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
