"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

// ---------- Fetcher ----------
async function fetchBalanceSheet() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("balance_sheet")
    .select("*")

  if (error) throw error
  return data as {
    ticker: string
    name: string
    asset_class: string
    quantity: number
    total_value: number
  }[]
}

// ---------- Hook ----------
export function useBalanceSheetData() {
  const { data, error, isLoading, mutate } = useSWR(
    "supabase/balance_sheet",
    fetchBalanceSheet,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
  const rawData = data ? data : []
  const totalAssets = rawData
    .filter((r) => r.asset_class != "equity" && r.asset_class !== "liability")
    .reduce((sum, r) => sum + (r.total_value), 0)
  const totalLiabilities = rawData
    .filter((r) => r.asset_class === "liability")
    .reduce((sum, r) => sum + (r.total_value), 0)
  const totalEquity = rawData
    .filter((r) => r.asset_class === "equity")
    .reduce((sum, r) => sum + (r.total_value), 0)

  return {
    bsData: rawData,
    totalAssets,
    totalLiabilities,
    totalEquity,
    error,
    isLoading,
    mutate,
  }
}
