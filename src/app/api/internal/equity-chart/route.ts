import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const threshold = 150

  try {
    // Authorization
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Supabase client
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_equity_chart_data", {
      p_threshold: threshold,
    })

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by range_label (same structure as benchmark API)
    const groupedData = data.reduce(
      (
        acc: {
          [key: string]: Array<{
            range_label: string
            snapshot_date: string
            net_equity_value: number
            total_cashflow: number
          }>
        },
        item: {
          range_label: string
          snapshot_date: string
          net_equity_value: number
          total_cashflow: number
        }
      ) => {
        const { range_label } = item
        if (!acc[range_label]) acc[range_label] = []
        acc[range_label].push(item)
        return acc
      },
      {}
    )

    return NextResponse.json(groupedData)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
