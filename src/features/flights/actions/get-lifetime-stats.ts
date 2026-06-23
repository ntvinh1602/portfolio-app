import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type LifetimeStats = {
  flights_count: number
  airports_count: number
  country_count: number
  airframe_count: number
  total_distance: number
  total_duration: string
}

export async function getLifetimeStats() {
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
