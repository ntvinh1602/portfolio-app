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

    // Call the RPC function (no filtering)
    const { data, error } = await supabase.rpc("get_annual_return")

    if (error) {
      console.error("Supabase RPC error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map RPC fields to frontend-friendly keys
    const annualReturn = data
      ? Object.fromEntries(
          data.map((item: { yr: string; equity_ret: number | null; vn_ret: number | null }) => [
            item.yr,
            {
              equity_return: item.equity_ret,
              vnindex_return: item.vn_ret,
            },
          ])
        )
      : {}

    return NextResponse.json(annualReturn)
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
