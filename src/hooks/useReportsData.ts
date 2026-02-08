import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"

export interface GatewayReportResponse {
  stockPnLData: Tables<"stock_annual_pnl">[]
  yearlyData: Tables<"yearly_snapshots">[]
  monthlyData: Tables<"monthly_snapshots">[]
}

// ----------------------------
// Default Fallback
// ----------------------------

const fallback: GatewayReportResponse = {
  stockPnLData: [],
  yearlyData: [],
  monthlyData: []
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
    monthlyData: data?.monthlyData || [],
    isLoading,
    error,
  }
}
