import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  const threshold = 150

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("get_equity_chart_data", {
      p_threshold: threshold,
    })

    if (error) {
      console.error("Error calling get_equity_chart_data function:", error)
      throw new Error("Internal Server Error")
    }

    // Process the new data structure
    const groupedData = data.reduce(
      (
        acc: Record<string, { snapshot_date: string; net_equity_value: number }[]>,
        item: {
          range_label: string
          snapshot_date: string
          net_equity_value: number
        },
      ) => {
        const { range_label, snapshot_date, net_equity_value } = item
        if (!acc[range_label]) {
          acc[range_label] = []
        }
        acc[range_label].push({ snapshot_date, net_equity_value })
        return acc
      },
      {},
    )

    return NextResponse.json(groupedData)
    
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}