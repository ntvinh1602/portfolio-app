import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type Aircraft = {
  id: string
  icao_code: string
  model: string | null
}

export default async function getAircrafts() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("aircrafts")
    .select("id, icao_code, model")
    .order("icao_code")

  if (error) throw new Error(error.message)
  return data as Aircraft[]
}
