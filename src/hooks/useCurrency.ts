"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

export function useCurrency() {
  const fetchCurrency = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("currencies")
      .select("*")
    if (error) throw new Error(error.message)
    return data as Tables<"currencies">[]
  }

  // ✅ Use a unique SWR key
  const { data, error, isLoading, mutate } = useSWR<Tables<"currencies">[]>(
    "currenciesData",
    fetchCurrency,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
