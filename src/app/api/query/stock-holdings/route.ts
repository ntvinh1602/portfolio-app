import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("get_stock_holdings")

    if (error) {
      throw error
    }

    return NextResponse.json(data)
    
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}