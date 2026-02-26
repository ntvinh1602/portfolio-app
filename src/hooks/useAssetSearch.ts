"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export function useAssetSearch(query: string, assetClass?: string) {
  const supabase = createClient()

  const fetcher = async () => {
    if (!query || query.length < 2) return []

    const { data, error } = await supabase
      .from("assets")
      .select("id, ticker, name")
      .eq("asset_class", assetClass ?? "")
      .ilike('ticker', `%${query}%`)
      .limit(20)

    if (error) throw new Error(error.message)
    return data ?? []
  }

  const { data = [], isLoading } = useSWR(
    query.length >= 2 ? ["asset-search", query, assetClass] : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return { data, isLoading }
}