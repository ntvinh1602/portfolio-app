"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface ReturnChartParams {
  time: string // "1y" | "6m" | "3m" | "all" | "2024"
}

interface ReturnChartResponse {
  date: string
  portfolio_value: number
  vni_value: number
}

interface SamplingParams {
  p_threshold: number
  p_start_date?: string
  p_end_date?: string
}

const supabase = createClient()

export function useReturnChartData({ time }: ReturnChartParams) {
  const shouldFetch = !!time

  const fetchReturnData = async (): Promise<ReturnChartResponse[]> => {
    if (!shouldFetch) return []

    const now = new Date()
    const threshold = 150
    let p_start_date: string | null = null
    let p_end_date: string | null = null

    // Determine start/end date
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

    const rpcParams: SamplingParams = { p_threshold: threshold }
    if (p_start_date && p_end_date) {
      rpcParams.p_start_date = p_start_date
      rpcParams.p_end_date = p_end_date
    }

    // Call RPC directly
    const { data, error } = await supabase.rpc("sampling_benchmark_data", rpcParams)

    if (error) {
      console.error("Supabase RPC error:", error)
      throw new Error(error.message)
    }

    return data || []
  }

  const { data, error, isLoading, mutate } = useSWR<ReturnChartResponse[]>(
    shouldFetch ? ["return-chart", time] : null,
    fetchReturnData,
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
