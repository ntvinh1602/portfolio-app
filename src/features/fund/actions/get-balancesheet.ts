import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Asset } from "@fund/fund.types"

export default async function getBalanceSheet() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("balance_sheet")
    .select("*")

  if (error) throw new Error(error.message)

  const rawData = (data as Asset[]) ?? []

  const totalAssets = rawData
    .filter((r) => r.asset_class !== "equity" && r.asset_class !== "liability")
    .reduce((sum, r) => sum + r.total_value, 0)

  const totalLiabilities = rawData
    .filter((r) => r.asset_class === "liability")
    .reduce((sum, r) => sum + r.total_value, 0)

  const totalEquity = rawData
    .filter((r) => r.asset_class === "equity")
    .reduce((sum, r) => sum + r.total_value, 0)

  return {
    bsData: rawData,
    totalAssets,
    totalLiabilities,
    totalEquity,
  }
}