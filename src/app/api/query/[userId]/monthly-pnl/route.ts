import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params
  const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID
  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 }
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
    const isAnonymous = !user.email
    const authenticatedUserId = isAnonymous ? DEMO_USER_ID : user.id

    // Security check: Ensure the authenticated user is requesting their own data
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.rpc("get_monthly_pnl", {
      p_user_id: requestedUserId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error("Error fetching monthly PnL:", error)
      throw new Error("Could not fetch monthly PnL data.")
    }

    const formattedData = data.map((item: { month: string }) => ({
      ...item,
      month: item.month,
    }))

    return NextResponse.json(formattedData)
    
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}