import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const transactionId = searchParams.get("transactionId")
  const includeExpenses = searchParams.get("include-expenses") === "true"

  if (!transactionId) {
    return NextResponse.json(
      { error: "transactionId is required" },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_transaction_details", {
    txn_id: transactionId,
    include_expenses: includeExpenses,
  })

  if (error) {
    console.error("Error fetching transaction details:", error)
    return NextResponse.json(
      { error: "Error fetching transaction details" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
