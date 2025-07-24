import { createClient } from "@/lib/supabase/supabaseServer"
import { type NextRequest, NextResponse } from "next/server"

// Route segment configuration
export const dynamic = "force-dynamic";
export const revalidate = 1800; // CDN cache TTL: 30 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params;
  const DEMO_USER_ID = process.env.DEMO_USER_ID;
  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables");
  }

  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");
  if (!start_date || !end_date) {
    console.error("API Route: Missing start_date or end_date");
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error("API Route: Unauthorized access attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const isAnonymous = !user.email;
    const authenticatedUserId = isAnonymous ? DEMO_USER_ID : user.id;

    // Security check: Ensure the authenticated user is requesting their own data
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("calculate_twr", {
      p_user_id: requestedUserId,
      p_start_date: start_date,
      p_end_date: end_date,
    })

    if (error) {
      console.error("Error calling calculate_twr function:", error)
      throw new Error("Internal Server Error")
    }

    return NextResponse.json(
      { twr: data },
      {
        headers: {
          "Vary": "Authorization",
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=360",
          "x-vercel-cache-tags": `twr-${requestedUserId}`,
        },
      }
    );
  } catch (e) {
    console.error("Unexpected error:", e)
    const errorMessage =
      e instanceof Error ? e.message : "Internal Server Error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}