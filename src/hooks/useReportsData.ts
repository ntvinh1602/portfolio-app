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

export interface CashflowItem {
  year: number
  deposits: number
  withdrawals: number
}

export interface GatewayReportResponse {
  stockPnL: Record<string, StockPnLItem[]>
  assets: Tables<"assets">[]
  cashflow: CashflowItem[]
}

// ----------------------------
// Default Fallback
// ----------------------------

const fallback: GatewayReportResponse = {
  stockPnL: {},
  assets: [],
  cashflow: [],
}

// ----------------------------
// Hook Definition
// ----------------------------

export function useReportsData(year?: string | number) {
  const endpoint =
    year && year !== "All Time"
      ? `/api/gateway/reports?year=${year}`
      : `/api/gateway/reports`

  const { data, error, isLoading } = useSWR<GatewayReportResponse>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: fallback,
    }
  ) as {
    data: GatewayReportResponse
    error: unknown
    isLoading: boolean
  }

  return {
    stockPnL: data.stockPnL || {},
    assets: data.assets || [],
    cashflow: data.cashflow || [],
    isLoading,
    error,
  }
}
