import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get("page_size")
    const pageNumber = searchParams.get("page_number")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const assetClassFilter = searchParams.get("asset_class_filter")

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_transaction_feed", {
      page_size: pageSize ? parseInt(pageSize) : 10,
      page_number: pageNumber ? parseInt(pageNumber) : 1,
      start_date: startDate,
      end_date: endDate,
      asset_class_filter: assetClassFilter,
    })

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=31536000, stale-while-revalidate=59' } })
  } catch (error) {
    console.error("Error fetching transaction feed:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction feed" },
      { status: 500 }
    )
  }
}