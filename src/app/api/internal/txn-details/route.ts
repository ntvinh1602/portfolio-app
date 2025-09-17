import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // --- Secret key check ---
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // --- Parse query parameters ---
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get("txnID")
    const includeExpenses = searchParams.get("isExpense") === "true"
      ? true
      : false

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      )
    }

    // --- Call Supabase RPC ---
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_transaction_details", {
      txn_id: transactionId,
      include_expenses: includeExpenses,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json(
        { error: "Error fetching transaction details" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error("Unexpected error fetching transaction details:", e)
    const message = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
