"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { getDateRange } from "@/lib/get-date-range"

async function fetchPnL(time: string) {
  const supabase = createClient()
  const { p_start_date, p_end_date } = getDateRange(time)

  const { data, error } = await supabase.rpc("calculate_pnl", {
    p_start_date,
    p_end_date,
  })
  console.log("param", time)
  console.log("start", p_start_date)
  console.log("end", p_end_date)
  if (error) throw error
  return data as number
}

/**
 * usePnL - fetches PnL data by year or by rolling period.
 * @param time - can be a year ("2024") or one of the following periods: "1m", "3m", "6m", "1y", "mtd", "ytd", "all"
 */
export function usePnL(time: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["pnl", "priceRefresh", time],
    () => fetchPnL(time),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}
