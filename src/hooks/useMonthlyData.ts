"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { startOfYear, endOfYear } from "date-fns"

interface MonthlySnapshot {
  snapshot_date: string
  pnl: number
  interest: number
  tax: number
  fee: number
}

type PeriodParam = string | number // "1y", "all", or 2024, 2025 etc.

const supabase = createClient()

async function fetchMonthlySnapshots(period: PeriodParam): Promise<MonthlySnapshot[]> {
  let query = supabase
    .from("monthly_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })

  if (period === "1y") {
    query = query.range(0, 11)
  } else if (period === "all") {
    // no filter
  } else if (typeof period === "number") {
    const start = startOfYear(new Date(period, 0, 1))
    const end = endOfYear(new Date(period, 0, 1))
    query = query
      .gte("snapshot_date", start.toISOString().slice(0, 10))
      .lte("snapshot_date", end.toISOString().slice(0, 10))
  } else {
    throw new Error("Invalid period parameter")
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

/**
 * SWR hook to fetch monthly performance snapshots.
 * @param period "1y" | "all" | 2024 | 2025 | etc.
 */
export function useMonthlyData(period: PeriodParam) {
  const { data, error, isLoading, mutate } = useSWR(
    ["monthlyData", "priceRefresh", period],
    () => fetchMonthlySnapshots(period),
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
