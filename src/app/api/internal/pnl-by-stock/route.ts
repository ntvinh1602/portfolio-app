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

    // Optional query param (e.g., /api/get-stock-profit-loss?year=2025)
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get("year")

    // Call RPC function
    const { data, error } = await supabase.rpc("get_annual_pnl_by_stock")

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If year filter is provided, filter client-side
    const filteredData = yearParam
      ? data.filter((item: { year: number }) => item.year === Number(yearParam))
      : data

    // Group by year for structured output
    const groupedData = filteredData.reduce(
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
