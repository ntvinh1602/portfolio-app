import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import yahooFinance from "https://esm.sh/yahoo-finance2@2.13.3"

interface QuoteLite {
  symbol: string
  regularMarketPrice: number | null
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")

async function sendTelegramMessage(message: string) {
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }),
      })
    } catch (err) {
      console.error("Failed to send Telegram message:", err)
    }
  }
}

Deno.serve(async (_req) => {
  try {
    // 1. Fetch stock + crypto assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker, asset_class")
      .eq("is_active", true)
      .in("asset_class", ["stock", "crypto"])

    if (assetError) {
      const msg = `❌ Error fetching assets: ${assetError.message}`
      console.error(msg)
      await sendTelegramMessage(msg)
      return new Response(JSON.stringify({ error: "Failed to load assets" }), { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ message: "No active stock/crypto assets" }), { status: 200 })
    }

    // 2. Map to Yahoo tickers
    const tickers = assets.map((a) =>
      a.asset_class === "crypto" ? `${a.ticker}-USD` : `${a.ticker}.VN`
    )

    // 3. Fetch batch quotes
    yahooFinance.suppressNotices(["yahooSurvey"])
    const results = (await yahooFinance.quote(tickers)) as QuoteLite[]

    // 4. Build rows
    const today = new Date().toISOString().split("T")[0]

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
        const msg = `❌ Stock upsert error: ${error.message}`
        console.error(msg)
        await sendTelegramMessage(msg)
        return new Response(JSON.stringify({ error: "Failed to upsert stock prices" }), { status: 500 })
      }
    }

    if (cryptoRows.length > 0) {
      const { error } = await supabase
        .from("daily_crypto_prices")
        .upsert(cryptoRows, { onConflict: "asset_id,date" })
      if (error) {
        const msg = `❌ Crypto upsert error: ${error.message}`
        console.error(msg)
        await sendTelegramMessage(msg)
        return new Response(JSON.stringify({ error: "Failed to upsert crypto prices" }), { status: 500 })
      }
    }

    return new Response(
      JSON.stringify({
        message: "✅ Prices refreshed successfully",
        stocks: stockRows.length,
        cryptos: cryptoRows.length,
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
