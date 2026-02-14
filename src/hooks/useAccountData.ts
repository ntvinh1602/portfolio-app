"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

// ---------- Types ----------
interface AccountData {
  assetData: Tables<"assets">[]
}

const fallback: AccountData = {
  assetData: []
}

// ---------- Fetcher ----------
async function fetchAccountData(): Promise<AccountData> {
  const supabase = createClient()

  // Query both tables in parallel
  const [assetsRes ] = await Promise.all([
    supabase.from("assets").select("*")
  ])

  if (assetsRes.error) throw new Error(assetsRes.error.message)

  return {
    assetData: assetsRes.data ?? []
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
    isLoading,
    error,
    mutate, // allows manual revalidation if needed
  }
}
