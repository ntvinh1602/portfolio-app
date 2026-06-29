import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { PerformanceView } from "@fund/fund.types"

export default async function getPerformance() {
  "use cache: private"
  cacheTag("performance", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase.from("performance_data").select()

  if (error) throw new Error(error.message)
  return data as PerformanceView[]
}
