import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic" // User-specific data

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
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user } = session
  const isAnonymous = !user.email
  const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id
  const sessionId = session.access_token.slice(-10)

  try {
    const { data, error } = await supabase.rpc("get_equity_chart_data", {
      p_user_id: userIdToUse,
      p_start_date: start_date,
      p_end_date: end_date,
      p_threshold: parseInt(threshold),
    })

    if (error) {
      console.error("Error calling get_equity_chart_data function:", error)
      throw new Error("Internal Server Error")
    }

    const cacheControl = isAnonymous
      ? "public, max-age=1800, stale-while-revalidate=360"
      : "private, max-age=1800, stale-while-revalidate=360"

    const cacheKey = isAnonymous
      ? `equity-chart-anon`
      : `equity-chart-${user.id}-${sessionId}`

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": cacheControl,
        "X-Cache-Key": cacheKey,
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}