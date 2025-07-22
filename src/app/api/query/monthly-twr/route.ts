import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

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
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Determine if the user is anonymous
    const isAnonymous = !user.email

    // Use demo user ID for anonymous users, otherwise use their real user ID
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

    const { data, error } = await supabase.rpc("get_monthly_twr", {
      p_user_id: userIdToUse,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error("Error fetching monthly TWR:", error)
      throw new Error("Could not fetch monthly TWR data.")
    }

    const formattedData = data.map((item: { month: string }) => ({
      ...item,
      month: item.month,
    }))

    return NextResponse.json(formattedData, {
      headers: {
        "Cache-Control": "s-maxage=31536000, stale-while-revalidate=59",
      },
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}