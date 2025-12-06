"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import { useStockPnLData } from "@/hooks/useStockPnLData"
import { useAccountData } from "@/hooks/useAccountData"
import * as Card from "@/components/ui/card"

export function StockLeaderboard({ year }: { year?: number }) {
  const { pnlByYear, isLoading: isPnLLoading, error: pnlError } = useStockPnLData(year)
  const { assets, loading: isAssetsLoading, error: assetsError } = useAccountData()

  const isLoading = isPnLLoading || isAssetsLoading
  const error = pnlError || assetsError

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <AssetSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card.Root className="p-4 text-center text-destructive">
        Failed to load stock data.
      </Card.Root>
    )
  }

  const yearKey = year?.toString() || Object.keys(pnlByYear)[0]
  const pnlList = pnlByYear[yearKey] || []

  if (pnlList.length === 0) {
    return (
      <Card.Root className="p-4 text-center text-muted-foreground">
        No realized profit/loss data for {yearKey || "selected year"}.
      </Card.Root>
    )
  }

  // Combine PnL records with asset metadata
  const stockAssets = assets.filter((a) => a.asset_class === "stock")
  const combined = pnlList.map((pnl) => {
    const asset = stockAssets.find((a) => a.ticker === pnl.ticker)
    return {
      ...pnl,
      name: asset?.name ?? pnl.ticker,
      logoUrl: asset?.logo_url ?? "",
    }
  })

  // Sort by total profit/loss descending
  const sorted = combined.sort((a, b) => b.total_pnl - a.total_pnl)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((stock) => (
        <Asset
          key={stock.asset_id}
          ticker={stock.ticker}
          name={stock.name}
          logoUrl={stock.logoUrl}
          totalAmount={stock.total_pnl}
        />
      ))}
    </div>
  )
}
