import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Asset } from "@fund/fund.types"

export default async function getStockHoldings() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
    const { data, error } = await supabase
      .from("balance_sheet")
      .select("ticker")
      .eq("asset_class", "stock")

  if (error) throw new Error(error.message)
  return (data ?? []) as {
    ticker: string
  }[]
}
