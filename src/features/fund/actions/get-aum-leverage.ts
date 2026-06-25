import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { AumLeverageCard } from "@fund/fund.types"

export default async function getAumLeverage() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("cash, stock, fund, total_equity, total_liabilities, debts, margin")
    .single()

  if (error) throw new Error(error.message)
  return data as AumLeverageCard
}
