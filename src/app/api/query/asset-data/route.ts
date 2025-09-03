import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import { Tables } from "@/types/database.types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: assetData, error: assetError } = await supabase
      .rpc("get_asset_data")
      .single()

    if (assetError) {
      throw assetError
    }

    return NextResponse.json(assetData as Tables<"assets">)

  } catch (e) {
    console.error("Unexpected error fetching asset account data:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}