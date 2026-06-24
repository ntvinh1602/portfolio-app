"use server"

import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type AssetSearchResult = {
  id: string
  ticker: string
  name: string
}

export async function searchAssets(query: string, assetClass: string) {
  "use cache: private"
  cacheTag("analytics")
  cacheLife("days")

  if (!query || query.length < 3) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("assets")
    .select("id, ticker, name")
    .eq("asset_class", assetClass)
    .ilike("ticker", `%${query}%`)
    .limit(20)

  if (error) throw new Error(error.message)
  return (data ?? []) as AssetSearchResult[]
}
