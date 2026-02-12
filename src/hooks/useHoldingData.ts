"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

interface HoldingDataResponse {
  stockData: Tables<"stock_holdings">[]
}

const fallback: HoldingDataResponse = {
  stockData: []
}

// ---------- Supabase Fetcher ----------
async function fetchHoldings(): Promise<HoldingDataResponse> {
  const supabase = createClient()

  const [stockRes] = await Promise.all([
    supabase.from("stock_holdings").select("*")
  ])

  if (stockRes.error) throw new Error(stockRes.error.message)

  return {
    stockData: stockRes.data ?? []
  }
}

// ---------- SWR Hook ----------
export function useHoldingData() {
  const { data, error, isLoading, mutate } = useSWR<HoldingDataResponse>(
    "holdings", // SWR key
    fetchHoldings,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: fallback,
    }
  )

  return {
    stockData: data?.stockData ?? [],
    isLoading,
    error,
    mutate, // allow manual refresh if needed
  }
}
