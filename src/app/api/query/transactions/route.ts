import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select("id, transaction_date, type, description")
    .neq("description", "Income tax")
    .neq("description", "Transaction fee")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Error fetching transactions" }, { status: 500 })
  }

  return NextResponse.json(data)
}