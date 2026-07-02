"use server"

import { getDnseClosePrice } from "@/features/dnse/api/market-data"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

type PriceRefreshResult = {
  message: string
  updated: number
  failed: number
}

type HistoricalPriceInsert =
  Database["public"]["Tables"]["historical_prices"]["Insert"]

function normalizeDnseDate(time: string | undefined) {
  if (!time) return null

  const directDateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(time)
  if (directDateMatch) {
    return directDateMatch[1]
  }

  const parsed = new Date(time)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().split("T")[0]
}

export async function fetchPrices(): Promise<PriceRefreshResult> {
  const supabase = await createClient()

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "active_stock_tickers",
  )
  if (rpcError) {
    throw new Error(rpcError.message ?? "Failed to fetch active stock tickers")
  }

  const tickers = (rpcData ?? []) as string[]

  if (!tickers.length) {
    return {
      message: "No active stock tickers found",
      updated: 0,
      failed: 0,
    }
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, ticker")
    .eq("is_active", true)
    .eq("asset_class", "stock")
    .in("ticker", tickers)

  if (assetsError) {
    throw new Error(assetsError.message ?? "Failed to resolve stock tickers")
  }

  const assetIdByTicker = new Map(
    (assets ?? []).map((asset) => [asset.ticker, asset.id]),
  )

  const failedTickers = tickers.filter((ticker) => !assetIdByTicker.has(ticker))
  const mappedTickers = tickers.filter((ticker) => assetIdByTicker.has(ticker))

  if (!mappedTickers.length) {
    return {
      message: "No mapped stock assets found for active tickers",
      updated: 0,
      failed: failedTickers.length,
    }
  }

  const priceResults = await Promise.allSettled(
    mappedTickers.map(async (ticker): Promise<HistoricalPriceInsert> => {
      const assetId = assetIdByTicker.get(ticker)
      if (!assetId) {
        throw new Error(`Missing asset id for ${ticker}`)
      }

      const response = await getDnseClosePrice(ticker)
      const closePrice = response.prices?.closePrice
      const priceDate = normalizeDnseDate(response.prices?.time)

      if (!Number.isFinite(closePrice)) {
        throw new Error(`Missing close price for ${ticker}`)
      }

      if (!priceDate) {
        throw new Error(`Missing valid price date for ${ticker}`)
      }

      return {
        asset_id: assetId,
        date: priceDate,
        close: closePrice,
      }
    }),
  )

  const rows: HistoricalPriceInsert[] = []

  priceResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      rows.push(result.value)
      return
    }

    failedTickers.push(mappedTickers[index])
  })

  if (!rows.length) {
    throw new Error("Failed to fetch DNSE close prices for all active tickers")
  }

  const { error: upsertError } = await supabase
    .from("historical_prices")
    .upsert(rows, {
      onConflict: "asset_id,date",
    })

  if (upsertError) {
    throw new Error(upsertError.message ?? "Failed to upsert prices")
  }

  const updated = rows.length
  const failed = failedTickers.length
  const message =
    failed > 0
      ? `Updated ${updated} price(s); failed ${failed} ticker(s)`
      : `Updated ${updated} price(s)`

  return {
    message,
    updated,
    failed,
  }
}
