import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import { Database } from "@/types/database.types"

type AirportRow = Database["flight"]["Tables"]["airports"]["Row"]

export type Airport = {
  [K in keyof AirportRow]: NonNullable<AirportRow[K]>
}

export default async function getAirports() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airports")
    .select("id, iata_code, name, lat, lng")

  if (error) throw new Error(error.message)
  return data as Airport[]
}
