import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

import { type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const supabase = await createClient()
  let query = supabase
    .from("transactions")
    .select("id, transaction_date, type, description")
    .neq("description", "Income tax")
    .neq("description", "Transaction fee")

  if (startDate) {
    query = query.gte("transaction_date", startDate)
  }
  if (endDate) {
    query = query.lte("transaction_date", endDate)
  }

  const { data, error } = await query
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Error fetching transactions" }, { status: 500 })
  }

  return NextResponse.json(data)
}