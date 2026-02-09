import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

interface EquityChartParams {
  time: string // "1y" | "6m" | "3m" | "all" | "2024"
}

interface EquityChartResponse {
  date: string
  net_equity_value: number
  total_cashflow: number
}

async function fetchEquityChartData(time: string) {
  const now = new Date()
  let p_start_date: string | null = null
  let p_end_date: string | null = null
  const threshold = 150

  // derive dates like before
  if (/^\d{4}$/.test(time)) {
    const year = parseInt(time, 10)
    p_start_date = `${year}-01-01`
    p_end_date = `${year}-12-31`
  } else {
    const start = new Date(now)
    switch (time) {
      case "all":
        p_start_date = "2021-11-01"
        p_end_date = now.toISOString().slice(0, 10)
        break
      case "1y":
        start.setFullYear(start.getFullYear() - 1)
        break
      case "6m":
        start.setMonth(start.getMonth() - 6)
        break
      case "3m":
        start.setMonth(start.getMonth() - 3)
        break
    }
    if (time !== "all") {
      p_start_date = start.toISOString().slice(0, 10)
      p_end_date = now.toISOString().slice(0, 10)
    }
  }

  const { data, error } = await supabase.rpc("sampling_equity_data", {
    p_threshold: threshold,
    p_start_date,
    p_end_date,
  })

  if (error) throw error
  return data as EquityChartResponse[]
}

export function useEquityChartData({ time }: EquityChartParams) {
  const { data, error, isLoading, mutate } = useSWR(
    time ? ["equityChartData", time] : null,
    () => fetchEquityChartData(time),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
    isError: Boolean(error),
  }
}
