"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { getDateRange } from "@/lib/get-date-range"

async function fetchEquityChartData(time: string) {
  const supabase = createClient()
  const { p_start_date, p_end_date } = getDateRange(time)
  const p_threshold = 150

  const { data, error } = await supabase.rpc("sampling_equity_data", {
    p_threshold,
    p_start_date,
    p_end_date,
  })

  if (error) throw error
  return data as {
    snapshot_date: string
    net_equity: number
    cumulative_cashflow: number
  }[]
}

/**
 * useEquityChartData - fetches equity chart data by year or by rolling period.
 * @param time - can be a year ("2024") or one of the following periods: "1m", "3m", "6m", "1y", "mtd", "ytd", "all"
 */
export function useEquityChartData(time: string) {
  const { data, error, isLoading, mutate } = useSWR(
    time ? ["equityChartData", time] : null,
    () => fetchEquityChartData(time),
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 60 * 5, // cache 5 minutes
    }
  )

  return {
    data: data || [],
    error,
    isLoading,
    mutate,
  }
}
