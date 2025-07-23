import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic" // User-specific data

export async function GET() {
  const supabase = await createClient()
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  try {
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

    const { data, error } = await supabase.rpc("get_first_snapshot_date", {
      p_user_id: userIdToUse,
    })

    if (error) {
      console.error("Error calling get_first_snapshot_date function:", error)
      throw new Error("Internal Server Error")
    }

    const cacheControl = isAnonymous
      ? "public, max-age=1800, stale-while-revalidate=360"
      : "private, max-age=1800, stale-while-revalidate=360"

    const cacheKey = isAnonymous
      ? `first-snapshot-date-anon`
      : `first-snapshot-date-${user.id}-${sessionId}`

    return NextResponse.json(
      { date: data },
      {
        headers: {
          "Vary": "Authorization",
          "Cache-Control": cacheControl,
          "X-Cache-Key": cacheKey,
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