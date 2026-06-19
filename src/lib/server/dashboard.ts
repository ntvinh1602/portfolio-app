import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"
import type { Dashboard } from "@/types/dashboard"

export async function getDashboard() {
  'use cache'
  cacheTag('dashboard', 'analytics')
  cacheLife('days')

  const { data, error } = await supabaseAdmin
    .from("dashboard_data")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Dashboard
}
