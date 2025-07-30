import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get all stock and crypto securities from the securities table
    const { data: securitiesData, error: securitiesError } = await supabase
      .from("securities")
      .select("ticker, asset_class")
      .in("asset_class", ["stock", "crypto"]);

    if (securitiesError) {
      throw securitiesError;
    }

    const allHoldings = (securitiesData || []).map((s: { ticker: string, asset_class: string }) => ({
      ticker: s.ticker,
      type: s.asset_class,
    }));

    const baseUrl = request.url.split('/api')[0]

    // 2. Refresh price for each holding in parallel
    const refreshPromises = allHoldings.map(async (holding: { ticker: string, type: string }) => {
      try {
        // 2a. Fetch the latest price
        const priceResponse = await fetch(`${baseUrl}/api/external/fetch-asset-data?ticker=${holding.ticker}&type=${holding.type}`);
        if (!priceResponse.ok) {
            console.error(`Failed to fetch price for ${holding.ticker}`);
            return; // Skip this one
        }
        const priceData = await priceResponse.json();

        // 2b. Save the new price
        await fetch(`${baseUrl}/api/database/save-asset-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: holding.ticker,
            price: priceData.price,
            type: holding.type,
          }),
        });
      } catch (e) {
        console.error(`Error processing refresh for ${holding.ticker}`, e)
      }
    });

    await Promise.all(refreshPromises);

    return NextResponse.json({ message: "Asset prices refreshed successfully." })
  } catch (error) {
    console.error("Error refreshing asset prices:", error)
    return NextResponse.json(
      { error: "Failed to refresh asset prices" },
      { status: 500 }
    )
  }
}