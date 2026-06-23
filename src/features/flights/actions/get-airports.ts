import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"

export type Airport = {
  id: string
  iata_code: string
  name: string
  lat: number
  lng: number
}

export async function getAirports() {
  "use cache"
  cacheTag("flights")
  cacheLife("days")

  const db = supabaseAdmin as any
  const { data, error } = await db
    .schema("flight")
    .from("airports")
    .select("id, iata_code, name, lat, lng")

  if (error) throw new Error(error.message)
  return data as Airport[]
}
