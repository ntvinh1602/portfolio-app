"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export function useHoldingData() {
  const fetchHoldings = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("stock_holdings").select("*")
    if (error) throw new Error(error.message)
    return data as {
      cost_basis: number
      logo_url: string
      market_value: number
      name: string
      price: number
      quantity: number
      ticker: string
    }[]
  }

  const { data, error, isLoading, mutate } = useSWR(
    "holdings",
    fetchHoldings,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate
  }
}

