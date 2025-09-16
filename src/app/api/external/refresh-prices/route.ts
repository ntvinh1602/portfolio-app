import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/supabaseServer"
import yahooFinance from "yahoo-finance2"

interface QuoteLite {
  symbol: string
  regularMarketPrice: number | null
}

export async function POST() {
  const supabase = await createClient()

  try {
    // 1. Fetch stock + crypto assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker, asset_class")
      .eq("is_active", true)
      .in("asset_class", ["stock", "crypto"])

    if (assetError) {
      console.error("Error fetching assets:", assetError)
      return NextResponse.json({ error: "Failed to load assets" }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ message: "No active stock/crypto assets" })
    }

    // 2. Map to Yahoo tickers
    const tickers = assets.map(a =>
      a.asset_class === "crypto" ? `${a.ticker}-USD` : `${a.ticker}.VN`
    )

    // 3. Fetch batch quotes
    yahooFinance.suppressNotices(["yahooSurvey"])
    const results = (await yahooFinance.quote(tickers)) as QuoteLite[]

    // 4. Build rows for insert
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    const stockRows: { asset_id: string; date: string; price: number }[] = []
    const cryptoRows: { asset_id: string; date: string; price: number }[] = []

    for (const asset of assets) {
      const symbol =
        asset.asset_class === "crypto" ? `${asset.ticker}-USD` : `${asset.ticker}.VN`
      const match = results.find((r) => r.symbol === symbol)
      if (!match?.regularMarketPrice) continue

      const row = {
        asset_id: asset.id,
        date: today,
        price: match.regularMarketPrice,
      }

      if (asset.asset_class === "stock") stockRows.push(row)
      if (asset.asset_class === "crypto") cryptoRows.push(row)
    }

    // 5. Upsert into Supabase
    if (stockRows.length > 0) {
      const { error } = await supabase
        .from("daily_stock_prices")
        .upsert(stockRows, { onConflict: "asset_id,date" })
      if (error) {
        console.error("Stock upsert error:", error)
        return NextResponse.json({ error: "Failed to upsert stock prices" }, { status: 500 })
      }
    }

    if (cryptoRows.length > 0) {
      const { error } = await supabase
        .from("daily_crypto_prices")
        .upsert(cryptoRows, { onConflict: "asset_id,date" })
      if (error) {
        console.error("Crypto upsert error:", error)
        return NextResponse.json({ error: "Failed to upsert crypto prices" }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "Prices refreshed successfully",
      stocks: stockRows.length,
      cryptos: cryptoRows.length,
    })
  } catch (e) {
    console.error("Unexpected error refreshing prices:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
