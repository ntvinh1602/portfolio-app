import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"

// ----------------------------
// Type Definitions
// ----------------------------

export interface StockPnLItem {
  asset_id: string
  ticker: string
  year: number
  total_pnl: number
}

export interface YearlyItem {
  year: string
  deposits: number
  withdrawals: number
  equity_return: number
  vnindex_return: number
}

export interface GatewayReportResponse {
  stockPnL: Record<string, StockPnLItem[]>
  assets: Tables<"assets">[]
  yearly: YearlyItem[]
}

// ----------------------------
// Default Fallback
// ----------------------------

const fallback: GatewayReportResponse = {
  stockPnL: {},
  assets: [],
  yearly: []
}

// ----------------------------
// Hook Definition
// ----------------------------

export function useReportsData() {
  const { data, error, isLoading } = useSWR<GatewayReportResponse>(
    "/api/gateway/reports",
    fetcher,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    stockPnL: data?.stockPnL || {},
    assets: data?.assets || [],
    yearly: data?.yearly || [],
    isLoading,
    error,
  }
}
