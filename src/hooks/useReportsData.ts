import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

// ----------------------------
// Type Definitions
// ----------------------------

export interface StockPnLItem {
  year: number
  ticker: string
  name: string
  logo_url: string
  total_pnl: number
}

export interface YearlyItem {
  year: string
  deposits: number
  withdrawals: number
  equity_ret: number
  vn_ret: number
}

export interface GatewayReportResponse {
  stockPnLData: StockPnLItem[]
  yearlyData: YearlyItem[]
}

// ----------------------------
// Default Fallback
// ----------------------------

const fallback: GatewayReportResponse = {
  stockPnLData: [],
  yearlyData: []
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
    stockPnLData: data?.stockPnLData || [],
    yearlyData: data?.yearlyData || [],
    isLoading,
    error,
  }
}
