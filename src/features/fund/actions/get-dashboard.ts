import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Dashboard } from "@/types/dashboard"

export async function getDashboard() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("dashboard_data")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Dashboard
}
