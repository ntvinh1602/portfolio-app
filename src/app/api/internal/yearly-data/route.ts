import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    // --- Authorization ---
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // --- Supabase client ---
    const supabase = await createClient()

    // --- Query the new view directly ---
    const { data, error } = await supabase
      .from("yearly_snapshots")
      .select("*")

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ message: "No data found" }, { status: 200 })
    }

    // --- Normalize output types ---
    const formatted = data.map((row) => ({
      year: row.year,
      deposits: Number(row.deposits ?? 0),
      withdrawals: Number(row.withdrawals ?? 0),
      equity_return: Number(row.equity_ret ?? 0),
      vnindex_return: Number(row.vn_ret ?? 0),
    }))

    // --- Respond ---
    return NextResponse.json(formatted, { status: 200 })
  } catch (e) {
    console.error("Unexpected error:", e)
    const message = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
