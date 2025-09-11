import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

import { type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_transactions", {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Error fetching transactions" }, { status: 500 })
  }

  return NextResponse.json(data)
}