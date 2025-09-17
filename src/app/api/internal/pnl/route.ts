import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {

  try {
    // Check Authorization header
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.MY_APP_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_pnl")

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

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}