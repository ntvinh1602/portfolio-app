import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic" // User-specific data

export async function GET() {
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
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

    const { data, error } = await supabase.rpc("get_stock_holdings", {
      p_user_id: userIdToUse,
    })

    if (error) {
      throw error
    }

    const cacheControl = isAnonymous
      ? "public, max-age=1800, stale-while-revalidate=360"
      : "private, max-age=1800, stale-while-revalidate=360"

    const cacheKey = isAnonymous
      ? `stock-holdings-anon`
      : `stock-holdings-${user.id}-${sessionId}`

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": cacheControl,
        "X-Cache-Key": cacheKey,
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}