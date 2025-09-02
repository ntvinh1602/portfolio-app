import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start")
  const endDate = new Date()

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

    const { data, error } = await supabase.rpc("get_monthly_expenses", {
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error("Error fetching monthly expenses:", error)
      throw new Error("Could not fetch monthly expenses data.")
    }

    return NextResponse.json(data)
    
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}