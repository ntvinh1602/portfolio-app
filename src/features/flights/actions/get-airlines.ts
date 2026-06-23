import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"

export type Airline = {
  id: string
  name: string
}

export default async function getAirlines() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airlines")
    .select("id, name")
    .order("name")

  if (error) throw new Error(error.message)
  return data as Airline[]
}
