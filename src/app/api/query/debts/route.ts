import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function GET() {
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  try {
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

    const { data, error } = await supabase.rpc("get_active_debts", {
      p_user_id: userIdToUse,
    })

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=31536000, stale-while-revalidate=59' } })
  } catch (error) {
    console.error("Error fetching debts:", error)
    return NextResponse.json(
      { error: "Failed to fetch debts" },
      { status: 500 }
    )
  }
}