import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Performance } from "@fund/fund.types"

export default async function getPerformance() {
  "use cache: private"
  cacheTag("performance", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase.from("recaps_data").select()

  if (error) throw new Error(error.message)
  return data as Performance[]
}
