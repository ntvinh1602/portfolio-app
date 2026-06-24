import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import { Database } from "@/types/database.types"

type AirlineRow = Database["flight"]["Tables"]["airlines"]["Row"]

export type Airline = {
  [K in keyof AirlineRow]: NonNullable<AirlineRow[K]>
}

export default async function getAirlines() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airlines")
    .select("*")
    .order("name")

  if (error) throw new Error(error.message)
  return data as Airline[]
}
