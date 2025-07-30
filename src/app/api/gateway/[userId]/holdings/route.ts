import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: requestedUserId } = await params
    const { headers } = request
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAnonymous = !user.email
    const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID
    if (!DEMO_USER_ID) {
      throw new Error("DEMO_USER_ID is not set in environment variables")
    }
    const userIdToUse = isAnonymous ? DEMO_USER_ID : user.id

    if (userIdToUse !== requestedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const revalidateTime = isAnonymous ? 3600 : 1800

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        revalidate: revalidateTime,
        tags: [`price-driven-${userIdToUse}`],
      },
    }

    const [stockHoldingsResponse, cryptoHoldingsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/${userIdToUse}/stock-holdings`, fetchOptions),
      fetch(`${baseUrl}/api/query/${userIdToUse}/crypto-holdings`, fetchOptions),
    ])

    for (const response of [stockHoldingsResponse, cryptoHoldingsResponse]) {
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error fetching holdings data: ${response.url} - ${response.status} ${response.statusText}`,
          errorText
        );
        throw new Error(`Failed to fetch from ${response.url}`);
      }
    }

    const [stockHoldings, cryptoHoldings] = await Promise.all([
      stockHoldingsResponse.json(),
      cryptoHoldingsResponse.json(),
    ]);

    return NextResponse.json(
      { stockHoldings, cryptoHoldings },
      {
        headers: {
          "Vary": "Authorization",
          "Cache-Control": "public, max-age=900, stale-while-revalidate=180",
          "x-vercel-cache-tags": `price-driven-${userIdToUse}`,
        },
      },
    )
  } catch (error) {
    console.error("Error fetching holdings data:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings data" },
      { status: 500 }
    );
  }
}