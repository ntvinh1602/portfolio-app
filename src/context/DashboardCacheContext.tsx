"use client"

import * as React from "react"
import { format, subDays, startOfMonth, subMonths } from "date-fns"

type EquityData = {
  date: string
  net_equity_value: number
}

type MonthlyPnlData = {
  month: string
  pnl: number
}

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

interface SummaryItem {
  type: string;
  totalAmount: number;
}

interface AssetSummaryData {
  assets: SummaryItem[];
  totalAssets: number;
  liabilities: SummaryItem[];
  totalLiabilities: number;
  equity: SummaryItem[];
  totalEquity: number;
}

interface DashboardData {
  equityData: EquityData[];
  twr: number | null;
  monthlyPnlData: MonthlyPnlData[];
  benchmarkData: BenchmarkData[];
  assetSummaryData: AssetSummaryData | null;
}

interface DashboardCacheContextType {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

const DashboardCacheContext = React.createContext<DashboardCacheContextType | undefined>(
  undefined
)

export function DashboardCacheProvider({ children }: { children: React.ReactNode }) {
  const [cachedData, setCachedData] = React.useState<Map<string, DashboardData>>(new Map())
  const [currentData, setCurrentData] = React.useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(
    async () => {
      // For simplicity, we'll use a fixed key for now, as the dashboard data
      // doesn't change based on date range like metrics.
      const cacheKey = "dashboard" 

      if (cachedData.has(cacheKey)) {
        setCurrentData(cachedData.get(cacheKey)!)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const endDate = new Date()
        const startDate = subDays(endDate, 90)
        const monthlyPnlStartDate = startOfMonth(subMonths(endDate, 11))

        const params = new URLSearchParams({
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          monthly_pnl_start_date: format(monthlyPnlStartDate, "yyyy-MM-dd"),
        })

        const response = await fetch(`/api/query/dashboard?${params.toString()}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch dashboard data.")
        }

        const data = await response.json()
        const newData: DashboardData = {
          equityData: data.equityData,
          twr: data.twrData.twr,
          monthlyPnlData: data.monthlyPnlData,
          benchmarkData: data.benchmarkData,
          assetSummaryData: data.assetSummaryData,
        }

        setCachedData(prev => new Map(prev).set(cacheKey, newData))
        setCurrentData(newData)
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message)
        } else {
          setError("An unknown error occurred.")
        }
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    },
    [cachedData]
  )

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const value = { data: currentData, isLoading, error, fetchData }

  return (
    <DashboardCacheContext.Provider value={value}>
      {children}
    </DashboardCacheContext.Provider>
  )
}

export function useDashboardCache() {
  const context = React.useContext(DashboardCacheContext)
  if (context === undefined) {
    throw new Error("useDashboardCache must be used within a DashboardCacheProvider")
  }
  return context
}