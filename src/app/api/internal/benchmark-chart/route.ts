import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {

  const threshold = 150

  try {
    // Check Authorization header
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_benchmark_chart_data", {
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
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}