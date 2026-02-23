"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { getDateRange } from "@/lib/get-date-range"

async function fetchReturnData(time: string) {
  const supabase = createClient()
  const { p_start_date, p_end_date } = getDateRange(time)
  const p_threshold = 150

  const { data, error } = await supabase.rpc("sampling_benchmark_data", {
    p_threshold,
    p_start_date,
    p_end_date
  })

  if (error) throw error
  return data as {
    snapshot_date: string
    portfolio_value: number
    vni_value: number
  }[]
}

export function useReturnChartData(time: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ["returnChart", "priceRefresh", time],
    () => fetchReturnData(time),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data: data || [],
    error,
    isLoading,
    mutate,
  }
}
