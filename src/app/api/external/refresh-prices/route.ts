import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import yahooFinance from "yahoo-finance2"

interface Asset {
  id: string
  ticker: string
  asset_class: string
}

interface SecurityData {
  asset_id: string
  date: string
  price: number
}

interface IndexData {
  symbol: string
  date: string
  close: number
}

export async function POST() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

  try {
    // 1. Fetch active assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker, asset_class")
      .eq("is_active", true)
      .in("asset_class", ["stock", "crypto", "index"])

    if (assetError) {
      console.error("Error fetching assets:", assetError)
      return NextResponse.json({ error: "Failed to load assets" }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ message: "No active assets" })
    }

    // 2. Mapping configs for each asset class
    const assetConfig: Record<
      string,
      {
        tickerFormatter: (ticker: string) => string
        rowBuilder: (asset: Asset, price: number) => SecurityData | IndexData
        targetRows: (SecurityData | IndexData)[]
        tableName: string
        conflictColumns: string
      }
    > = {
      stock: {
        tickerFormatter: (t) => `${t}.VN`,
        rowBuilder: (a, price) => ({ asset_id: a.id, date: today, price }),
        targetRows: [],
        tableName: "daily_security_prices",
        conflictColumns: "asset_id,date",
      },
      crypto: {
        tickerFormatter: (t) => `${t}-USD`,
        rowBuilder: (a, price) => ({ asset_id: a.id, date: today, price }),
        targetRows: [],
        tableName: "daily_security_prices",
        conflictColumns: "asset_id,date",
      },
      index: {
        tickerFormatter: (t) => `^${t}.VN`,
        rowBuilder: (a, price) => ({ symbol: a.ticker, date: today, close: price }),
        targetRows: [],
        tableName: "daily_market_indices",
        conflictColumns: "symbol,date",
      },
    }

    // 3. Map assets to Yahoo tickers
    const tickers = assets.map((a) => assetConfig[a.asset_class]?.tickerFormatter(a.ticker) || a.ticker)

    // 4. Fetch batch quotes
    yahooFinance.suppressNotices(["yahooSurvey"])
    const results = await yahooFinance.quote(tickers)

    // 5. Build rows
    for (const asset of assets) {
      const config = assetConfig[asset.asset_class]
      if (!config) continue

      const symbol = config.tickerFormatter(asset.ticker)
      const match = results.find((r) => r.symbol === symbol)
      if (!match?.regularMarketPrice) continue

      config.targetRows.push(config.rowBuilder(asset, match.regularMarketPrice))
    }

    // 6. Upsert dynamically
    for (const key of Object.keys(assetConfig)) {
      const { targetRows, tableName, conflictColumns } = assetConfig[key]
      if (targetRows.length === 0) continue

      const { error } = await supabase
        .from(tableName)
        .upsert(targetRows, { onConflict: conflictColumns })
      if (error) {
        console.error(`${key} upsert error:`, error)
        return NextResponse.json({ error: `Failed to upsert ${key} prices` }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "Prices refreshed successfully",
      stocks: assetConfig.stock.targetRows.length,
      cryptos: assetConfig.crypto.targetRows.length,
      indices: assetConfig.index.targetRows.length,
    })
  } catch (e) {
    console.error("Unexpected error refreshing prices:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
