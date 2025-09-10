import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const transactionId = searchParams.get("transactionId")

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transaction_legs")
    .select("*, assets(name, ticker, asset_class)")
    .eq("transaction_id", transactionId)

  if (error) {
    console.error("Error fetching transaction legs:", error)
    return NextResponse.json({ error: "Error fetching transaction legs" }, { status: 500 })
  }

  return NextResponse.json(data)
}