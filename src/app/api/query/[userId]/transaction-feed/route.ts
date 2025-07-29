import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic";
export const revalidate = 1800; // CDN cache TTL: 30 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params;
  const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID;
  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAnonymous = !user.email;
    const authenticatedUserId = isAnonymous ? DEMO_USER_ID : user.id;

    // Security check: Ensure the authenticated user is requesting their own data
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get("page_size");
    const pageNumber = searchParams.get("page_number");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const assetClassFilter = searchParams.get("asset_class_filter");

    const { data, error } = await supabase.rpc("get_transaction_feed", {
      p_user_id: requestedUserId,
      page_size: pageSize ? parseInt(pageSize) : 10,
      page_number: pageNumber ? parseInt(pageNumber) : 1,
      start_date: startDate,
      end_date: endDate,
      asset_class_filter: assetClassFilter,
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=360",
        "x-vercel-cache-tags": `txn-driven-${requestedUserId}`,
      },
    });
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}