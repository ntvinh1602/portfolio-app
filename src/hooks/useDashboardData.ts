import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  calculateCAGR,
  calculateSharpeRatio,
} from "@/lib/utils"
import { lifetime } from "@/lib/start-dates"
import {
  BalanceSheetData,
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
  balanceSheetData: BalanceSheetData | null
  stockData: StockData[]
  cryptoData: CryptoData[]
}

export function useDashboardData() {
  const { data, error, isLoading } = useSWR<DashboardApiResponse>(
    "/api/gateway/dashboard",
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true }
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
    balanceSheetData: data?.balanceSheetData ?? null,
    stockData: data?.stockData ?? null,
    cryptoData: data?.cryptoData ?? null,
    cagr,
    sharpeRatio,
    isLoading,
    error,
  }
}