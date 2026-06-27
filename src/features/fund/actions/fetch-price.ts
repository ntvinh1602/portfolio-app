"use server"

import { createClient } from "@/lib/supabase/server"

export async function fetchPrices() {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke(
    "fetch-yahoofinance",
    { body: { name: "Functions" } },
  )

  if (error) throw new Error(error.message ?? "Failed to update prices")
  return data as { message: string; updated: number }
}
