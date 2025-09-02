import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get("page_size")
    const pageNumber = searchParams.get("page_number")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const assetClassFilter = searchParams.get("asset_class_filter")
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("get_transaction_feed", {
      page_size: pageSize ? parseInt(pageSize) : 10,
      page_number: pageNumber ? parseInt(pageNumber) : 1,
      start_date: startDate,
      end_date: endDate,
      asset_class_filter: assetClassFilter,
    })

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