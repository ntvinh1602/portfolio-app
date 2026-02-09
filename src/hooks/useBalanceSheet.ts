"use client"

import useSWR from "swr"
import { Tables } from "@/types/database.types"
import { createClient } from "@/lib/supabase/client"

// ---------- Types ----------
export interface BalanceSheetData {
  balanceSheet: Tables<"balance_sheet">[]
}

// ---------- Fetcher ----------
async function fetchBalanceSheet(): Promise<BalanceSheetData> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("balance_sheet")
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to fetch balance sheet data")
  }

  return { balanceSheet: data ?? [] }
}

// ---------- Hook ----------
export function useBalanceSheetData() {
  const { data, error, isLoading } = useSWR(
    "supabase/balance_sheet",
    fetchBalanceSheet,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return { ...data, isLoading, error }
}
