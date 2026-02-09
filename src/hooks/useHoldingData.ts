"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

interface HoldingDataResponse {
  stockData: Tables<"stock_holdings">[]
  cryptoData: Tables<"crypto_holdings">[]
}

const fallback: HoldingDataResponse = {
  stockData: [],
  cryptoData: [],
}

// ---------- Supabase Fetcher ----------
async function fetchHoldings(): Promise<HoldingDataResponse> {
  const supabase = createClient()

  const [stockRes, cryptoRes] = await Promise.all([
    supabase.from("stock_holdings").select("*"),
    supabase.from("crypto_holdings").select("*"),
  ])

  if (stockRes.error) throw new Error(stockRes.error.message)
  if (cryptoRes.error) throw new Error(cryptoRes.error.message)

  return {
    stockData: stockRes.data ?? [],
    cryptoData: cryptoRes.data ?? [],
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
    cryptoData: data?.cryptoData ?? [],
    isLoading,
    error,
    mutate, // allow manual refresh if needed
  }
}
