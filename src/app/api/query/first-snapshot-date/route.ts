import { createClient } from "@/lib/supabase/supabaseServer"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  try {
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

    const { data, error } = await supabase.rpc("get_first_snapshot_date", {
      p_user_id: userIdToUse,
    })

    if (error) {
      console.error("Error calling get_first_snapshot_date function:", error)
      throw new Error("Internal Server Error")
    }
    return NextResponse.json({ date: data }, {
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