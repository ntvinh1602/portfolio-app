"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { getDateRange } from "@/lib/get-date-range"


async function fetchTWR(time: string) {
  const supabase = createClient()
  const { p_start_date, p_end_date } = getDateRange(time)
  const { data, error } = await supabase.rpc("calculate_twr", {
    p_start_date,
    p_end_date,
  })
  if (error) throw error
  return data as number
}

/**
 * usePnL - fetches PnL data by year or by rolling period.
 * @param range - can be a year ("2024") or a period ("1m", "3m", "6m", "all")
 */
export function useTWR(time: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["twr", "priceRefresh", time], // use range as cache key for simplicity
    () => fetchTWR(time),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data: data || 0,
    error,
    isLoading,
    mutate,
  }
}
