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
  CryptoData,
  PnLData,
  TWRData
} from "@/types/dashboard-data"

interface DashboardApiResponse {
  twrData: TWRData
  monthlyReturnData: number[]
  pnlData: PnLData
  equityData: {
    all_time: EquityChartData[]
    "1y": EquityChartData[]
    "6m": EquityChartData[]
    "3m": EquityChartData[]
  }
  benchmarkData: {
    all_time: BenchmarkChartData[]
    "1y": BenchmarkChartData[]
    "6m": BenchmarkChartData[]
    "3m": BenchmarkChartData[]
  }
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
 
  const cagr = data && years > 0
    ? calculateCAGR(1, 1 + data.twrData.all_time, years)
    : null
 
  const sharpeRatio = data
    ? calculateSharpeRatio(data.monthlyReturnData, 0.055)
    : null
 
  return {
    twrData: data?.twrData ?? null,
    pnlData: data?.pnlData ?? null,
    equityData: data?.equityData ?? { all_time: [], "1y": [], "6m": [], "3m": [] },
    benchmarkData: data?.benchmarkData ?? { all_time: [], "1y": [], "6m": [], "3m": [] },
    assetSummaryData: data?.assetSummaryData ?? null,
    stockData: data?.stockData ?? null,
    cryptoData: data?.cryptoData ?? null,
    cagr,
    sharpeRatio,
    isLoading,
    error,
  }
}