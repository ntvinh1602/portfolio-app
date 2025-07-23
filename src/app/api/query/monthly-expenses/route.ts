import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic" // User-specific data

export async function GET(request: NextRequest) {
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 },
    )
  }

  try {
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

    const { data, error } = await supabase.rpc("get_monthly_expenses", {
      p_user_id: userIdToUse,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error("Error fetching monthly expenses:", error)
      throw new Error("Could not fetch monthly expenses data.")
    }

    const cacheControl = isAnonymous
      ? "public, max-age=1800, stale-while-revalidate=360"
      : "private, max-age=1800, stale-while-revalidate=360"

    const cacheKey = isAnonymous
      ? `monthly-expenses-anon`
      : `monthly-expenses-${user.id}-${sessionId}`

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": cacheControl,
        "X-Cache-Key": cacheKey,
      },
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}