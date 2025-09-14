import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  BalanceSheetData,
  EquityChartData,
  BenchmarkChartData,
  StockData,
  CryptoData,
  PnLData,
  TWRData,
  MonthlyData
} from "@/types/dashboard-data"

interface DashboardApiResponse {
  twrData: TWRData
  monthlyData: MonthlyData[]
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
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const years =
    (new Date().getTime() - new Date('2021-11-09').getTime()) / (1000 * 60 * 60 * 24 * 365.25)
 
  const cagr = data && years > 0
    ? (Math.pow(1 + data.twrData.all_time, 1 / years) - 1) * 100
    : null
 
  return {
    twrData: data?.twrData ?? null,
    pnlData: data?.pnlData ?? null,
    equityData: data?.equityData ?? { all_time: [], "1y": [], "6m": [], "3m": [] },
    benchmarkData: data?.benchmarkData ?? { all_time: [], "1y": [], "6m": [], "3m": [] },
    balanceSheetData: data?.balanceSheetData ?? null,
    stockData: data?.stockData ?? null,
    cryptoData: data?.cryptoData ?? null,
    monthlyData: data?.monthlyData ?? null,
    cagr,
    isLoading,
    error,
  }
}