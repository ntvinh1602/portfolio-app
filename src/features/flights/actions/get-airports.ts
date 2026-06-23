import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type Airport = {
  id: string
  iata_code: string
  name: string
  lat: number
  lng: number
}

export async function getAirports() {
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
