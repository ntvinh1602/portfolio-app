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
  const rawData = data ? data : []
  const totalAssets = rawData
    .filter((r) => r.type === "asset")
    .reduce((sum, r) => sum + (r.amount), 0)
  const totalLiabilities = rawData
    .filter((r) => r.type === "liability")
    .reduce((sum, r) => sum + (r.amount), 0)
  const totalEquity = rawData
    .filter((r) => r.type === "equity")
    .reduce((sum, r) => sum + (r.amount), 0)
  const debtsPrincipal = rawData
    .filter((r) => r.account === "Debts Principal")
    .reduce((sum, r) => sum + (r.amount), 0)
  const accruedInterest = rawData
    .filter((r) => r.account === "Accrued Interest")
    .reduce((sum, r) => sum + (r.amount), 0)
  const margin = rawData
    .filter((r) => r.account === "Margin")
    .reduce((sum, r) => sum + (r.amount), 0)
  const fund = rawData
    .filter((r) => r.account === "Fund")
    .reduce((sum, r) => sum + (r.amount), 0)

  return {
    bsData: rawData,
    totalAssets,
    totalLiabilities,
    totalEquity,
    debtsPrincipal,
    accruedInterest,
    margin,
    fund,
    error,
    isLoading,
    mutate,
  }
}
