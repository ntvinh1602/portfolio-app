import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { EquityReturnView } from "@fund/fund.types"

export default async function getEquityReturn() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("equity_return_data")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EquityReturnView
}
