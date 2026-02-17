// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import YahooFinance from "https://esm.sh/yahoo-finance2@@3.11.2" // ✅ upgraded import

// === CONFIG ===
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, serviceRoleKey)
const today = new Date().toISOString().split("T")[0]

// === CORS HEADERS ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or restrict to your domain
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// === ENTRYPOINT ===
serve(async (req: Request) => {
  // Preflight handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1️⃣ Load active assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker, asset_class")
      .eq("is_active", true)
      .in("asset_class", ["stock", "crypto", "index"])

    if (assetError) throw new Error("Failed to load assets")
    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ message: "No active assets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2️⃣ Configuration per class
    const assetConfig: Record<
      string,
      {
        tickerFormatter: (t: string) => string
        rowBuilder: (asset: any, price: number) => any
        targetRows: any[]
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

    // 3️⃣ Prepare tickers and query Yahoo
    const tickers = assets.map(
      (a) => assetConfig[a.asset_class]?.tickerFormatter(a.ticker) ?? a.ticker
    )
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] })
    const quotes = await yahooFinance.quote(tickers)
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes]

    // 4️⃣ Match prices
    for (const asset of assets) {
      const cfg = assetConfig[asset.asset_class]
      if (!cfg) continue
      const symbol = cfg.tickerFormatter(asset.ticker)
      const q = quotesArray.find((x) => x.symbol === symbol)
      if (!q?.regularMarketPrice) continue
      cfg.targetRows.push(cfg.rowBuilder(asset, q.regularMarketPrice))
    }

    // 5️⃣ Upsert into Supabase
    for (const key of Object.keys(assetConfig)) {
      const { targetRows, tableName, conflictColumns } = assetConfig[key]
      if (targetRows.length === 0) continue
      const { error } = await supabase
        .from(tableName)
        .upsert(targetRows, { onConflict: conflictColumns })
      if (error) throw new Error(`Failed to upsert ${key}: ${error.message}`)
    }

    // ✅ Success
    return new Response(
      JSON.stringify({
        message: "Prices refreshed successfully",
        stocks: assetConfig.stock.targetRows.length,
        cryptos: assetConfig.crypto.targetRows.length,
        indices: assetConfig.index.targetRows.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err: any) {
    console.error("Error:", err)
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
