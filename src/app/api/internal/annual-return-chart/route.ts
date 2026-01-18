import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // --- Secret key check ---
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // --- Parse query parameters ---
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get("year")

    if (!yearParam) {
      return NextResponse.json(
        { error: "Missing year parameter" },
        { status: 400 }
      )
    }

    const year = parseInt(yearParam, 10)
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 })
    }

    // --- Compute start and end dates for the year ---
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    // --- Call Supabase RPC with fixed threshold 150 ---
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("sampling_benchmark_data", {
      p_start_date: startDate,
      p_end_date: endDate,
      p_threshold: 150
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
