import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start_date")
  const end_date = searchParams.get("end_date")
  
  if (!start_date || !end_date) {
    console.error("API Route: Missing start_date or end_date")
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error("API Route: Unauthorized access attempt.")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { data, error } = await supabase.rpc("calculate_pnl", {
      p_user_id: user.id,
      p_start_date: start_date,
      p_end_date: end_date,
    })

    if (error) {
      console.error("Error calling calculate_pnl function:", error)
      throw new Error("Internal Server Error")
    }

    return NextResponse.json(
      { pnl: data },
      {
        headers: {
          "Cache-Control": "s-maxage=31536000, stale-while-revalidate=59",
        },
      },
    )
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}