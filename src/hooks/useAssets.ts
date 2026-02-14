"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/types/database.types"

export function useAssets() {
  const fetchAssets = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("assets").select("*")
    if (error) throw new Error(error.message)
    return data ?? []
  }

  const { data = [], error, isLoading, mutate } = useSWR<Tables<"assets">[]>(
    "assetsData",
    fetchAssets,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return { assetData: data, isLoading, error, mutate }
}
