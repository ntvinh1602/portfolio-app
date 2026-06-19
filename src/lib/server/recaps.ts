import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"
import type { Recaps } from "@/types/recaps"

export async function getRecaps() {
  'use cache'
  cacheTag('recaps', 'analytics')
  cacheLife('days')

  const { data, error } = await supabaseAdmin
    .from("reports_data")
    .select()

  if (error) throw new Error(error.message)
  return data as Recaps
}
