import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

// Route segment configuration
export const dynamic = "force-dynamic";
export const revalidate = 1800; // CDN cache TTL: 30 minutes

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await params;
  const DEMO_USER_ID = process.env.DEMO_USER_ID;
  if (!DEMO_USER_ID) {
    throw new Error("DEMO_USER_ID is not set in environment variables");
  }

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const isAnonymous = !user.email;
    const authenticatedUserId = isAnonymous ? DEMO_USER_ID : user.id;

    // Security check: Ensure the authenticated user is requesting their own data
    if (authenticatedUserId !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("get_active_debts", {
      p_user_id: requestedUserId,
    });

    if (error) {
      throw error
    }

    return NextResponse.json(data, {
      headers: {
        "Vary": "Authorization",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=360",
        "x-vercel-cache-tags": `debts-${requestedUserId}`,
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