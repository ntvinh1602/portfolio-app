import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import { Database } from "@/types/database.types"

type StatsRow = Database["flight"]["Views"]["lifetime_stats"]["Row"]

export type LifetimeStats = {
  [K in keyof StatsRow]: NonNullable<StatsRow[K]>
}

export default async function getLifetimeStats(): Promise<LifetimeStats | null> {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("lifetime_stats")
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return data as LifetimeStats
}
