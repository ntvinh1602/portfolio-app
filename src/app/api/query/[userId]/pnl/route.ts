import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("API Route: Unauthorized access attempt.")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.rpc("get_pnl", {
      p_user_id: requestedUserId,
    })

    if (error) {
      console.error("Error calling get_pnl function:", error)
      throw new Error("Internal Server Error")
    }

    const transformedData = data.reduce((acc: Record<string, number>, item: { range_label: string; pnl: number }) => {
      acc[item.range_label] = item.pnl
      return acc
    }, {})

    return NextResponse.json(transformedData)

  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}