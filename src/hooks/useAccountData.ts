"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

// ---------- Types ----------
interface AccountData {
  assetData: Tables<"assets">[]
  debtData: Tables<"debts">[]
}

const fallback: AccountData = {
  assetData: [],
  debtData: [],
}

// ---------- Fetcher ----------
async function fetchAccountData(): Promise<AccountData> {
  const supabase = createClient()

  // Query both tables in parallel
  const [assetsRes, debtsRes] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("debts").select("*").is("repay_txn_id", null),
  ])

  if (assetsRes.error) throw new Error(assetsRes.error.message)
  if (debtsRes.error) throw new Error(debtsRes.error.message)

  return {
    assetData: assetsRes.data ?? [],
    debtData: debtsRes.data ?? [],
  }
}

// ---------- SWR Hook ----------
export function useAccountData() {
  const { data, error, isLoading, mutate } = useSWR<AccountData>(
    "accountData", // SWR cache key
    fetchAccountData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: fallback,
    }
  )

  return {
    assetData: data?.assetData ?? [],
    debtData: data?.debtData ?? [],
    isLoading,
    error,
    mutate, // allows manual revalidation if needed
  }
}
