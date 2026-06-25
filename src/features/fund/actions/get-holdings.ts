import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { BalanceSheet } from "@fund/fund.types"

export default async function getHoldings() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
    const { data, error } = await supabase
      .from("balance_sheet")
      .select("*")
      .eq("asset_class", "stock")
      .single()

  if (error) throw new Error(error.message)
  return data as BalanceSheet[]
}
