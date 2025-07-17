import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("daily_performance_snapshots")
      .select("date")
      .order("date", { ascending: true })
      .limit(1)
      .single()

    if (error) {
      console.error("Error fetching first snapshot date:", error)
      throw new Error("Error fetching first snapshot date")
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=59",
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}