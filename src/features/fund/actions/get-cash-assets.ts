"use server"

import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Tables } from "@/types/database.types"

export async function getCashAssets() {
  "use cache: private"
  cacheTag("analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .in("asset_class", ["cash", "fund"])

  if (error) throw new Error(error.message)
  return (data ?? []) as Tables<"assets">[]
}
