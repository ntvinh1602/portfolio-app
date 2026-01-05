import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import YahooFinance from "https://esm.sh/yahoo-finance2@@3.11.2" // ✅ upgraded import

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

// --- Initialize Supabase client ---
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// --- Telegram alert helper ---
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")

async function sendTelegramMessage(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
    })
  } catch (err) {
    console.error("Failed to send Telegram message:", err)
  }
}

// --- Main function ---
Deno.serve(async () => {
  const today = new Date().toISOString().split("T")[0]

  try {
    // 1️⃣ Fetch all active assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker, asset_class")
      .eq("is_active", true)
      .in("asset_class", ["stock", "crypto", "index"])

    if (assetError) {
      const msg = `❌ Error fetching assets: ${assetError.message}`
      console.error(msg)
      await sendTelegramMessage(msg)
      return new Response(JSON.stringify({ error: "Failed to load assets" }), { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ message: "No active assets" }), { status: 200 })
    }

    // 2️⃣ Asset configuration
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

    // 3️⃣ Map assets to Yahoo tickers
    const tickers = assets.map((a) => assetConfig[a.asset_class]?.tickerFormatter(a.ticker) || a.ticker)

    // 4️⃣ Initialize Yahoo Finance client (v3)
    const yahooFinance = new YahooFinance({
      suppressNotices: ["yahooSurvey"],
    })

    // 5️⃣ Fetch batch quotes
    const result = await yahooFinance.quote(tickers)
    const quotes = Array.isArray(result) ? result : [result]

    // 6️⃣ Build price rows
    for (const asset of assets) {
      const config = assetConfig[asset.asset_class]
      if (!config) continue

      const symbol = config.tickerFormatter(asset.ticker)
      const match = quotes.find((r) => r.symbol === symbol)
      if (!match?.regularMarketPrice) continue

      config.targetRows.push(config.rowBuilder(asset, match.regularMarketPrice))
    }

    // 7️⃣ Upsert into Supabase
    for (const key of Object.keys(assetConfig)) {
      const { targetRows, tableName, conflictColumns } = assetConfig[key]
      if (targetRows.length === 0) continue

      const { error } = await supabase.from(tableName).upsert(targetRows, { onConflict: conflictColumns })
      if (error) {
        const msg = `❌ ${key} upsert error: ${error.message}`
        console.error(msg)
        await sendTelegramMessage(msg)
        return new Response(JSON.stringify({ error: `Failed to upsert ${key} prices` }), { status: 500 })
      }
    }

    // ✅ Return success silently
    return new Response(
      JSON.stringify({
        message: "✅ Prices refreshed successfully",
        stocks: assetConfig.stock.targetRows.length,
        cryptos: assetConfig.crypto.targetRows.length,
        indices: assetConfig.index.targetRows.length,
      }),
      { status: 200 }
    )
  } catch (e) {
    const msg = `🔥 Unexpected error refreshing prices: ${e instanceof Error ? e.message : String(e)}`
    console.error(msg)
    await sendTelegramMessage(msg)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
})
