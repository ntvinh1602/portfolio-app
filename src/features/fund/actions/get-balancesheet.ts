import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import { Database } from "@/types/database.types"

type BSRow = Database["public"]["Views"]["balance_sheet"]["Row"]

export type BalanceSheet = {
  [K in keyof BSRow]: NonNullable<BSRow[K]>
}

export default async function getBalanceSheet() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("balance_sheet")
    .select("*")

  if (error) throw new Error(error.message)

  const rawData = (data as BalanceSheet[]) ?? []

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
