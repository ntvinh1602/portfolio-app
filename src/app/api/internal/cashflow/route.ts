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

    // --- Optional query param (e.g. /api/get-yearly-cashflow-summary?year=2025) ---
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get("year")

    // --- Call the RPC function ---
    const { data, error } = await supabase.rpc("get_annual_cashflow")

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ message: "No data found" }, { status: 200 })
    }

    // --- Optional: filter client-side by year ---
    const filteredData = yearParam
      ? data.filter((row: { year: number }) => row.year === Number(yearParam))
      : data

    // --- Normalize output structure ---
    const formatted = filteredData.map(
      (row: {
        year: number
        deposits: number
        withdrawals: number
      }) => ({
        year: row.year,
        deposits: Number(row.deposits),
        withdrawals: Number(row.withdrawals),
      })
    )

    // --- Respond ---
    return NextResponse.json(formatted)
  } catch (e) {
    console.error("Unexpected error:", e)
    const message = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
