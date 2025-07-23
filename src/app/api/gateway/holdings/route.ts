import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabaseServer";

// Route segment configuration
export const revalidate = 3600;
export const dynamic = "force-dynamic"; // Since we need user-specific data

export async function GET(request: Request) {
  try {
    const { headers } = request;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? "anonymous";

    const baseUrl = request.url.split("/api")[0];

    const [stockHoldingsResponse, cryptoHoldingsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/query/stock-holdings`, {
        headers,
        next: { tags: [`asset-data-${userId}`, "holdings", "stocks"] },
      }),
      fetch(`${baseUrl}/api/query/crypto-holdings`, {
        headers,
        next: { tags: [`asset-data-${userId}`, "holdings", "crypto"] },
      }),
    ]);

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