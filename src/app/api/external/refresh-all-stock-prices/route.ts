import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get all stock holdings
    const { data: holdings, error: holdingsError } = await supabase.rpc('get_stock_holdings');
    if (holdingsError) throw holdingsError;

    const baseUrl = request.url.split('/api')[0]

    // 2. Refresh price for each holding in parallel
    const refreshPromises = holdings.map(async (holding: { ticker: string }) => {
      try {
        // 2a. Fetch the latest price
        const priceResponse = await fetch(`${baseUrl}/api/external/fetch-stock-data?ticker=${holding.ticker}`);
        if (!priceResponse.ok) {
            console.error(`Failed to fetch price for ${holding.ticker}`);
            return; // Skip this one
        }
        const priceData = await priceResponse.json();

        // 2b. Save the new price
        await fetch(`${baseUrl}/api/database/save-stock-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: holding.ticker, price: priceData.price }),
        });
      } catch (e) {
        console.error(`Error processing refresh for ${holding.ticker}`, e)
      }
    });

    await Promise.all(refreshPromises);

    // 3. Update the last_stock_fetching timestamp
    await supabase
        .from('profiles')
        .update({ last_stock_fetching: new Date().toISOString() })
        .eq('id', user.id);


    return NextResponse.json({ message: "Stock prices refreshed successfully." })
  } catch (error) {
    console.error("Error refreshing stock prices:", error)
    return NextResponse.json(
      { error: "Failed to refresh stock prices" },
      { status: 500 }
    )
  }
}