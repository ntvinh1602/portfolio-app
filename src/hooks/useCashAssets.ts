"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

export function useCashAssets() {
  const fetchAssets = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .in('asset_class', ['cash', 'fund'])
    if (error) throw new Error(error.message)
    return data ?? []
  }

  const { data = [], error, isLoading, mutate } = useSWR<Tables<"assets">[]>(
    "cashAssets",
    fetchAssets,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return { data, isLoading, error, mutate }
}
