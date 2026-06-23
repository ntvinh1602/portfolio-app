import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Recaps } from "@/types/recaps"

export async function getRecaps() {
  "use cache: private"
  cacheTag("recaps", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase.from("reports_data").select()

  if (error) throw new Error(error.message)
  return data as Recaps
}
