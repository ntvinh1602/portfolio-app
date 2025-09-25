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
} from "@/app/dashboard/types/dashboard-data"
import { Tables } from "@/types/database.types"

interface DelayedDataApiResponse {
  twrData: TWRData
  monthlyData: Tables<"monthly_snapshots">[]
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
  balanceSheetData: BalanceSheetData
  stockData: StockData[]
  cryptoData: CryptoData[]
}

export function useDelayedData() {
  const { data, error, isLoading } = useSWR<DelayedDataApiResponse>(
    "/api/gateway/dashboard",
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )
 
  return {
    twrData: data?.twrData,
    pnlData: data?.pnlData,
    equityData: data?.equityData,
    benchmarkData: data?.benchmarkData,
    bsData: data?.balanceSheetData,
    stockData: data?.stockData,
    cryptoData: data?.cryptoData,
    monthlyData: data?.monthlyData,
    isLoading,
    error,
  }
}