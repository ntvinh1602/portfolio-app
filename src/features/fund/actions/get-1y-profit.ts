import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Last1YProfitView } from "@fund/fund.types"

export default async function get1yProfit() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("last_1y_profit")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Last1YProfitView
}
