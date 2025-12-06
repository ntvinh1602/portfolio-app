import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export interface StockPnLItem {
  asset_id: string
  ticker: string
  year: number
  total_pnl: number
}

export interface StockPnLResponse {
  stockProfitLossData: Record<string, StockPnLItem[]>
  updatedAt: string
}

const fallback: StockPnLResponse = {
  stockProfitLossData: {},
  updatedAt: "",
}

export function useStockPnLData(year?: number) {
  const endpoint = year
    ? `/api/gateway/reports?year=${year}`
    : `/api/gateway/reports`

  const { data, error, isLoading } = useSWR<StockPnLResponse>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: fallback,
    }
  ) as {
    data: StockPnLResponse
    error: unknown
    isLoading: boolean
  }

  const pnlByYear = data.stockProfitLossData || {}

  return {
    pnlByYear,
    updatedAt: data.updatedAt,
    isLoading,
    error,
  }
}
