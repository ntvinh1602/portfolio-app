import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start_date")
  const end_date = searchParams.get("end_date")
  const threshold = searchParams.get("threshold")

  if (!start_date || !end_date || !threshold) {
    return NextResponse.json(
      { error: "start_date, end_date and threshold are required" },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Determine if the user is anonymous
  const isAnonymous = !user.email

  // Use demo user ID for anonymous users, otherwise use their real user ID
  const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

  try {
    const { data, error } = await supabase.rpc("get_benchmark_chart_data", {
      p_user_id: userIdToUse,
      p_start_date: start_date,
      p_end_date: end_date,
      p_threshold: parseInt(threshold),
    })

    if (error) {
      console.error(
        "Error calling get_benchmark_chart_data function:",
        error,
      )
      throw new Error("Internal Server Error")
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=31536000, stale-while-revalidate=59",
        "Vary": "Authorization"
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}