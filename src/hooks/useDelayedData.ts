import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  StockData,
  CryptoData
} from "@/app/dashboard/types/dashboard-data"
import { Tables } from "@/types/database.types"

interface DelayedDataApiResponse {
  monthlyData: Tables<"monthly_snapshots">[]
  balanceSheetData: Tables<"balance_sheet">[]
  stockData: StockData[]
  cryptoData: CryptoData[]
}

const fallback: DelayedDataApiResponse = {
  balanceSheetData: [],
  stockData: [],
  cryptoData: [],
  monthlyData: [],
}

export function useDelayedData() {
  const { data, error, isLoading } = useSWR<DelayedDataApiResponse>(
    "/api/gateway/dashboard",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: fallback,
    }
  ) as {
    data: DelayedDataApiResponse
    error: unknown
    isLoading: boolean
  }
 
  return {
    bsData: data.balanceSheetData,
    stockData: data.stockData,
    cryptoData: data.cryptoData,
    monthlyData: data.monthlyData,
    isLoading,
    error,
  }
}