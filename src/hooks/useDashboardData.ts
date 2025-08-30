import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"
import {
  calculateCAGR,
  calculateSharpeRatio,
} from "@/lib/utils"
import { lifetime } from "@/lib/start-dates"
import {
  AssetSummaryData,
  EquityChartData,
  BenchmarkChartData,
  StockData,
  CryptoData
} from "@/types/dashboard-data"

interface DashboardApiResponse {
  ytdReturnData: number | null
  lifetimeReturnData: number | null
  monthlyReturnData: number[]
  lifetimePnLData: number | null
  ytdPnLData: number | null
  mtdPnLData: number | null
  equityData: {
    all_time: EquityChartData[]
    "1y": EquityChartData[]
    "6m": EquityChartData[]
    "3m": EquityChartData[]
  }
  last90DBenchmarkData: BenchmarkChartData[]
  ytdBenchmarkData: BenchmarkChartData[]
  lifetimeBenchmarkData: BenchmarkChartData[]
  assetSummaryData: AssetSummaryData | null
  stockData: StockData[]
  cryptoData: CryptoData[]
}

export function useDashboardData() {
  const { userId } = useAuth()
  const { data, error, isLoading } = useSWR<DashboardApiResponse>(
    () => {
      if (!userId) return null
 
      return `/api/gateway/${userId}/dashboard`
    },
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )
 
  const years =
    (new Date().getTime() - new Date(lifetime).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
 
  const cagr =
    data?.lifetimeReturnData !== null && data?.lifetimeReturnData !== undefined && years > 0
      ? calculateCAGR(1, 1 + data.lifetimeReturnData, years)
      : null
 
  const sharpeRatio =
    data?.monthlyReturnData && data.monthlyReturnData.length > 0
      ? calculateSharpeRatio(data.monthlyReturnData, 0.055)
      : null
 
  return {
    ytdReturnData: data?.ytdReturnData ?? null,
    lifetimeReturnData: data?.lifetimeReturnData ?? null,
    lifetimePnLData: data?.lifetimePnLData ?? null,
    ytdPnLData: data?.ytdPnLData ?? null,
    mtdPnLData: data?.mtdPnLData ?? null,
    equityData: data?.equityData ?? { all_time: [], "1y": [], "6m": [], "3m": [] },
    last90DBenchmarkData: data?.last90DBenchmarkData ?? [],
    ytdBenchmarkData: data?.ytdBenchmarkData ?? [],
    lifetimeBenchmarkData: data?.lifetimeBenchmarkData ?? [],
    assetSummaryData: data?.assetSummaryData ?? null,
    stockData: data?.stockData ?? null,
    cryptoData: data?.cryptoData ?? null,
    cagr,
    sharpeRatio,
    isLoading,
    error,
  }
}