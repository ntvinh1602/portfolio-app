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
      const priceEntry = response.prices?.find((p) => p.boardId === "G1")
      const closePrice = priceEntry?.closePrice

      if (closePrice === undefined || !Number.isFinite(closePrice)) {
        throw new Error(`Missing close price for ${ticker}`)
      }

      if (!priceEntry?.time) {
        throw new Error(`Missing valid price date for ${ticker}`)
      }

      return {
        asset_id: assetId,
        date: priceEntry.time.slice(0, 10),
        close: closePrice * 1000,
      }
    }),
  )

  const rows: HistoricalPriceInsert[] = []
  const errors: string[] = []

  priceResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      rows.push(result.value)
      return
    }

    failedTickers.push(mappedTickers[index])
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason)
    errors.push(`${mappedTickers[index]}: ${reason}`)
  })

  if (!rows.length) {
    const detail = errors.slice(0, 3).join("; ")
    const suffix = errors.length > 3 ? ` (+${errors.length - 3} more)` : ""
    throw new Error(
      `Failed to fetch DNSE close prices for all ${errors.length} ticker(s): ${detail}${suffix}`,
    )
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
