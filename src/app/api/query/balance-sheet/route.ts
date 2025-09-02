import { createClient } from "@/lib/supabase/supabaseServer"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("get_balance_sheet")

    if (error) {
      console.error("Error calling get_balance_sheet function:", error)
      throw new Error("Internal Server Error")
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