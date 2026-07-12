"use server"

import { createClient } from "@/lib/supabase/server"

export async function DeleteFlight(flightId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .schema("flight")
    .from("flights")
    .delete()
    .eq("id", flightId)

  if (error) throw new Error(error.message)
}
