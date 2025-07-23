import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

// Route segment configuration
export const dynamic = "force-dynamic" // Since we need user-specific data

export async function GET(request: Request) {
  try {
    const { headers } = request
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    const isAnonymous = !user?.email
    const sessionId = session?.access_token?.slice(-10) ?? "anon"
    const cacheKey = user ? `holdings-${user.id}-${sessionId}` : "holdings-anonymous"
    const revalidateTime = isAnonymous ? 3600 : 1800

    const baseUrl = request.url.split("/api")[0]

    const fetchOptions = {
      headers,
      next: {
        tags: [cacheKey],
        revalidate: revalidateTime,
      },
    }

    const [stockHoldingsResponse, cryptoHoldingsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/stock-holdings`, fetchOptions),
      fetch(`${baseUrl}/api/query/crypto-holdings`, fetchOptions),
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

    return NextResponse.json({ stockHoldings, cryptoHoldings });
  } catch (error) {
    console.error("Error fetching holdings data:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings data" },
      { status: 500 }
    );
  }
}