// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import YahooFinance from "https://esm.sh/yahoo-finance2@3.11.2"

// === CONFIG ===
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SB_SECRET_KEY")!
const supabase = createClient(supabaseUrl, serviceRoleKey)
const today = new Date().toISOString().split("T")[0]

// === CORS HEADERS ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1️⃣ Load active stock + index assets
    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, ticker")
      .eq("is_active", true)
      .in("asset_class", ["stock", "index"])

    if (assetError) throw assetError
    if (!assets?.length) {
      return new Response(
        JSON.stringify({ message: "No active assets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2️⃣ Format tickers (same treatment)
    const formatTicker = (ticker: string) => `${ticker}.VN`

    const tickers = assets.map((a) => formatTicker(a.ticker))

    // 3️⃣ Fetch quotes
    const yahooFinance = new YahooFinance({
      suppressNotices: ["yahooSurvey"],
    })

    const quotes = await yahooFinance.quote(tickers)
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes]

    // 4️⃣ Build rows
    const rows: any[] = []

    for (const asset of assets) {
      const symbol = formatTicker(asset.ticker)
      const quote = quotesArray.find((q) => q.symbol === symbol)

      if (!quote?.regularMarketPrice) continue

      rows.push({
        asset_id: asset.id,
        date: today,
        close: quote.regularMarketPrice,
      })
    }

    if (!rows.length) {
      return new Response(
        JSON.stringify({ message: "No valid prices returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 5️⃣ Single upsert
    const { error: upsertError } = await supabase
      .from("daily_security_prices")
      .upsert(rows, { onConflict: "asset_id,date" })

    if (upsertError) throw upsertError

    return new Response(
      JSON.stringify({
        message: "Prices refreshed successfully",
        updated: rows.length,
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