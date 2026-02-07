import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    // Authorization
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Supabase client
    const supabase = await createClient()

    // Fetch all data from the view
    const { data, error } = await supabase
      .from("stock_annual_pnl")
      .select("*")

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ message: "No data found" }, { status: 200 })
    }

    // Group by year for structured output
    const groupedData = data.reduce(
      (
        acc: {
          [key: string]: Array<{
            asset_id: string
            ticker: string
            year: number
            total_pnl: number
          }>
        },
        item: {
          asset_id: string
          ticker: string
          year: number
          total_pnl: number
        }
      ) => {
        const { year } = item
        if (!acc[year]) acc[year] = []
        acc[year].push(item)
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
