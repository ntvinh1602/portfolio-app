import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = 'force-dynamic' // User-specific data
export const revalidate = 3600

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

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        // Optional: Add cache hints for CDN/browser
        ...(isAnonymous && {
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=360"
        })
      },
    })
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}