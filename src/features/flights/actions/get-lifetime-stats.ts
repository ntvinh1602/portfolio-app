import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import { Database } from "@/types/database.types"

type StatsRow = Database["flight"]["Views"]["lifetime_stats"]["Row"]

export type LifetimeStats = {
  [K in keyof StatsRow]: NonNullable<StatsRow[K]>
}

export default async function getLifetimeStats() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("lifetime_stats")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LifetimeStats
}
