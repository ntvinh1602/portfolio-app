import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { NetProfitCard } from "@fund/fund.types"

export default async function getNetProfit() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("total_pnl, avg_profit, avg_expense, profit_chart")
    .single()

  if (error) throw new Error(error.message)
  return data as NetProfitCard
}
