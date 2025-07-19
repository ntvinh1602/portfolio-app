"use client"

import * as React from "react"
import { startOfMonth, startOfYear, format as formatDate } from "date-fns"
import { calculateCAGR, calculateSharpeRatio } from "@/lib/utils"

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

interface MetricsData {
  cagr: number | null
  sharpeRatio: number | null
  totalPnl: number | null
  totalReturn: number | null
  benchmarkChartData: BenchmarkData[]
}

interface MetricsCacheContextType {
  data: MetricsData | null
  isLoading: boolean
  error: string | null
  firstSnapshotDate: Date | null
  fetchDataForDateRange: (dateRange: string) => Promise<void>
}

const MetricsCacheContext = React.createContext<MetricsCacheContextType | undefined>(
  undefined
)

export function MetricsCacheProvider({ children }: { children: React.ReactNode }) {
  const [cachedData, setCachedData] = React.useState<Map<string, MetricsData>>(new Map())
  const [currentData, setCurrentData] = React.useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [firstSnapshotDate, setFirstSnapshotDate] = React.useState<Date | null>(null)

  // This effect runs once to get the first snapshot date, which is static.
  React.useEffect(() => {
    const fetchFirstDate = async () => {
      try {
        const res = await fetch("/api/query/first-snapshot-date")
        if (!res.ok) throw new Error("Failed to fetch first snapshot date")
        const data = await res.json()
        setFirstSnapshotDate(new Date(data.date))
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      }
    }
    fetchFirstDate()
  }, [])

  const fetchDataForDateRange = React.useCallback(
    async (dateRange: string) => {
      // If data for this range is already cached, serve it instantly.
      if (cachedData.has(dateRange)) {
        setCurrentData(cachedData.get(dateRange)!)
        return
      }

      // If we don't have the first snapshot date yet, we can't proceed.
      if (!firstSnapshotDate) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const endDate = new Date()
        let startDate = firstSnapshotDate
        if (dateRange === "mtd") {
          startDate = startOfMonth(endDate)
        } else if (dateRange === "ytd") {
          startDate = startOfYear(endDate)
        }

        const lifetimeStartDateStr = formatDate(firstSnapshotDate, "yyyy-MM-dd")
        const currentStartDateStr = formatDate(startDate, "yyyy-MM-dd")
        const endDateStr = formatDate(endDate, "yyyy-MM-dd")

        const [
          performanceRes,
          monthlyTwrRes,
          pnlRes,
          twrRes,
          benchmarkChartRes,
        ] = await Promise.all([
          fetch(`/api/query/twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`),
          fetch(`/api/query/monthly-twr?start_date=${lifetimeStartDateStr}&end_date=${endDateStr}`),
          fetch(`/api/query/pnl?start_date=${currentStartDateStr}&end_date=${endDateStr}`),
          fetch(`/api/query/twr?start_date=${currentStartDateStr}&end_date=${endDateStr}`),
          fetch(`/api/query/benchmark-chart?start_date=${currentStartDateStr}&end_date=${endDateStr}&threshold=200`),
        ])

        const performance = await performanceRes.json()
        const monthlyTwrData = await monthlyTwrRes.json()
        const pnlData = await pnlRes.json()
        const twrData = await twrRes.json()
        const benchmarkData = await benchmarkChartRes.json()

        const years = (endDate.getTime() - firstSnapshotDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        const cagrValue = calculateCAGR(1, 1 + performance.twr, years)
        const monthlyReturns = monthlyTwrData.map((item: { twr: number }) => item.twr)
        const sharpeRatioValue = calculateSharpeRatio(monthlyReturns, 0.055)

        const newData: MetricsData = {
          cagr: cagrValue,
          sharpeRatio: sharpeRatioValue,
          totalPnl: pnlData.pnl,
          totalReturn: twrData.twr,
          benchmarkChartData: benchmarkData,
        }

        // Store the new data in the cache and set it as the current data.
        setCachedData(prev => new Map(prev).set(dateRange, newData))
        setCurrentData(newData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics data")
      } finally {
        setIsLoading(false)
      }
    },
    [firstSnapshotDate, cachedData]
  )

  const value = { data: currentData, isLoading, error, firstSnapshotDate, fetchDataForDateRange }

  return (
    <MetricsCacheContext.Provider value={value}>
      {children}
    </MetricsCacheContext.Provider>
  )
}

export function useMetricsCache() {
  const context = React.useContext(MetricsCacheContext)
  if (context === undefined) {
    throw new Error("useMetricsCache must be used within a MetricsCacheProvider")
  }
  return context
}