import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params

  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start")
  const end_date = new Date()
  const threshold = 200

  if (!start_date || !end_date || !threshold) {
    return NextResponse.json(
      { error: "start_date, end_date and threshold are required" },
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
    // Security check: Ensure the authenticated user is requesting their own data
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.rpc("get_equity_chart_data", {
      p_user_id: requestedUserId,
      p_start_date: start_date,
      p_end_date: end_date,
      p_threshold: threshold,
    })

    if (error) {
      console.error("Error calling get_equity_chart_data function:", error)
      throw new Error("Internal Server Error")
    }

    return NextResponse.json(data)
    
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}