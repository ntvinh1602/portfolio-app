import { supabaseAdmin } from "@/lib/supabase/admin"
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
  "use cache"
  cacheTag("flights")
  cacheLife("days")

  // flight schema tables not in generated Database type — use untyped client
  const db = supabaseAdmin as any
  const { data, error } = await db
    .schema("flight")
    .from("lifetime_stats")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LifetimeStats
}
