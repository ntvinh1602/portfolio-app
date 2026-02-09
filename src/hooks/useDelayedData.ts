import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
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
  balanceSheetData: Tables<"balance_sheet">[]
  stockData: StockData[]
  cryptoData: CryptoData[]
}

const fallback: DelayedDataApiResponse = {
  twrData: {
    all_time: 0,
    ytd: 0
  },
  pnlData: {
    all_time: 0,
    ytd: 0,
    mtd: 0
  },
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
    twrData: data.twrData,
    pnlData: data.pnlData,
    bsData: data.balanceSheetData,
    stockData: data.stockData,
    cryptoData: data.cryptoData,
    monthlyData: data.monthlyData,
    isLoading,
    error,
  }
}