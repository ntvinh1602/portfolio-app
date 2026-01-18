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

// Frontend-friendly type
export interface AnnualReturnItem {
  equity_return: number | null
  vnindex_return: number | null
}

export interface GatewayReportResponse {
  stockPnL: Record<string, StockPnLItem[]>
  assets: Tables<"assets">[]
  cashflow: CashflowItem[]
  annualReturn: Record<string, AnnualReturnItem>
}

// ----------------------------
// Default Fallback
// ----------------------------

const fallback: GatewayReportResponse = {
  stockPnL: {},
  assets: [],
  cashflow: [],
  annualReturn: {},
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

  // Annual return is already an object keyed by year; just fallback safely
  const annualReturn: Record<string, AnnualReturnItem> = data?.annualReturn || {}

  return {
    stockPnL: data?.stockPnL || {},
    assets: data?.assets || [],
    cashflow: data?.cashflow || [],
    annualReturn,
    isLoading,
    error,
  }
}
