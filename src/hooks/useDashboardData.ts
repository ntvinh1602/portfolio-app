import { useState, useEffect, useCallback } from "react"
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
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const [equityData, setEquityData] = useState<EquityData[]>([])
  const [twr, setTwr] = useState<number | null>(null)
  const [monthlyPnlData, setMonthlyPnlData] = useState<MonthlyPnlData[]>([])
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([])
  const [assetSummaryData, setAssetSummaryData] = useState<AssetSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
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
      setEquityData(data.equityData)
      setTwr(data.twrData.twr)
      setMonthlyPnlData(data.monthlyPnlData)
      setBenchmarkData(data.benchmarkData)
      setAssetSummaryData(data.assetSummaryData)
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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    equityData,
    twr,
    monthlyPnlData,
    benchmarkData,
    assetSummaryData,
    isLoading,
    error,
  }
}