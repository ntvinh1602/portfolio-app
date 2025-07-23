import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function GET(request: Request) {
  const DEMO_USER_ID = process.env.DEMO_USER_ID

  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables")
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Determine if the user is anonymous
    const isAnonymous = !user.email

    // Use demo user ID for anonymous users, otherwise use their real user ID
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get("page_size")
    const pageNumber = searchParams.get("page_number")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const assetClassFilter = searchParams.get("asset_class_filter")
    
    const { data, error } = await supabase.rpc("get_transaction_feed", {
      p_user_id: userIdToUse,
      page_size: pageSize ? parseInt(pageSize) : 10,
      page_number: pageNumber ? parseInt(pageNumber) : 1,
      start_date: startDate,
      end_date: endDate,
      asset_class_filter: assetClassFilter,
    })

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=31536000, stale-while-revalidate=59', "Vary": "Authorization" } })
  } catch (error) {
    console.error("Error fetching transaction feed:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction feed" },
      { status: 500 }
    )
  }
}