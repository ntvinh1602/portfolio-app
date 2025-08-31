import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params

  const threshold = 200

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

    const { data, error } = await supabase.rpc("get_benchmark_chart_data", {
      p_user_id: requestedUserId,
      p_threshold: threshold,
    })

    if (error) {
      console.error("Error calling get_benchmark_chart_data function:", error)
      throw new Error("Internal Server Error")
    }

    // Group data by range_label
    const groupedData = data.reduce(
      (
        acc: {
          [key: string]: Array<{
            range_label: string
            snapshot_date: string
            portfolio_value: number
            vni_value: number
          }>
        },
        item: {
          range_label: string
          snapshot_date: string
          portfolio_value: number
          vni_value: number
        }
      ) => {
        const { range_label } = item
        if (!acc[range_label]) {
          acc[range_label] = []
        }
        acc[range_label].push(item)
        return acc
      },
      {}
    )

    return NextResponse.json(groupedData)
    
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}