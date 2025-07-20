import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get all stock and crypto holdings
    const { data: stockHoldings, error: stockHoldingsError } = await supabase.rpc('get_stock_holdings');
    if (stockHoldingsError) throw stockHoldingsError;

    const { data: cryptoHoldings, error: cryptoHoldingsError } = await supabase.rpc('get_crypto_holdings');
    if (cryptoHoldingsError) throw cryptoHoldingsError;

    const allHoldings = [
      ...stockHoldings.map((h: { ticker: string }) => ({ ...h, type: 'stock' })),
      ...cryptoHoldings.map((h: { ticker: string }) => ({ ...h, type: 'crypto' })),
    ];

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

    // 3. Update the last_fetching timestamp
    await supabase
        .from('profiles')
        .update({ last_stock_fetching: new Date().toISOString() })
        .eq('id', user.id);


    return NextResponse.json({ message: "Asset prices refreshed successfully." })
  } catch (error) {
    console.error("Error refreshing asset prices:", error)
    return NextResponse.json(
      { error: "Failed to refresh asset prices" },
      { status: 500 }
    )
  }
}