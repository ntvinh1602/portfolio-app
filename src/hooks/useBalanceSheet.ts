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
    account: string
    type: string
    amount: number
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

  return {
    data: data || [],
    error,
    isLoading,
    mutate,
  }
}
