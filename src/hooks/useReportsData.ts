"use client"

import useSWR from "swr"
import { Tables } from "@/types/database.types"
import { createClient } from "@/lib/supabase/client"

export interface GatewayReportResponse {
  stockPnLData: Tables<"stock_annual_pnl">[]
  yearlyData: Tables<"yearly_snapshots">[]
}

async function fetchReports() {
  const supabase = createClient()

  const [stockPnL, yearly] = await Promise.all([
    supabase.from("stock_annual_pnl").select("*"),
    supabase.from("yearly_snapshots").select("*"),
  ])

  if (stockPnL.error || yearly.error) {
    throw new Error(
      stockPnL.error?.message ||
      yearly.error?.message ||
      "Failed to fetch Supabase data"
    )
  }

  return {
    stockPnLData: stockPnL.data ?? [],
    yearlyData: yearly.data ?? []
  }
}

export function useReportsData() {
  const { data, error, isLoading } = useSWR(
    "supabase/reports",
    fetchReports,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return { ...data, isLoading, error }
}
