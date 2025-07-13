import { createClient } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { supabase } = createClient(request)

  const { data, error } = await supabase
    .from("daily_performance_snapshots")
    .select("date")
    .order("date", { ascending: true })
    .limit(1)
    .single()

  if (error) {
    console.error("Error fetching first snapshot date:", error)
    return NextResponse.json(
      { error: "Error fetching first snapshot date" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}