"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import { useReportsData } from "@/hooks/useReportsData"
import * as Card from "@/components/ui/card"
import { StockPnLItem } from "@/hooks/useReportsData"

export function StockLeaderboard({ year }: { year?: string | number }) {
  const {
    stockPnL,
    assets,
    isLoading,
    error,
  } = useReportsData(year)

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

  let pnlList: StockPnLItem[] = []
  const yearKey = year?.toString()

  if (yearKey === "All Time") {
    // Merge all years for "All Time"
    const mergedPnL: Record<string, StockPnLItem> = {}
    Object.values(stockPnL).forEach((yearData) => {
      yearData.forEach((item) => {
        if (!mergedPnL[item.ticker]) {
          mergedPnL[item.ticker] = { ...item }
        } else {
          mergedPnL[item.ticker].total_pnl += item.total_pnl
        }
      })
    })
    pnlList = Object.values(mergedPnL)
  } else {
    const activeYearKey = yearKey || Object.keys(stockPnL)[0]
    pnlList = stockPnL[activeYearKey] || []
  }

  if (pnlList.length === 0) {
    return (
      <Card.Root className="p-4 text-center text-muted-foreground">
        No realized profit/loss data for {yearKey || "selected year"}.
      </Card.Root>
    )
  }

  // Combine PnL records with asset metadata (now directly from gateway)
  const stockAssets = assets.filter((a) => a.asset_class === "stock")
  const combined = pnlList.map((pnl) => {
    const asset = stockAssets.find((a) => a.ticker === pnl.ticker)
    return {
      ...pnl,
      name: asset?.name ?? pnl.ticker,
      logoUrl: asset?.logo_url ?? "",
    }
  })

  // Filter for gainers (positive PnL) and sort by total profit/loss descending
  const topPerformers = combined
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  if (topPerformers.length === 0) {
    return (
      <Card.Root className="p-4 text-center text-muted-foreground">
        No stock found for {yearKey || "selected year"}.
      </Card.Root>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {topPerformers.map((stock, index) => (
        <Asset
          key={stock.asset_id}
          rank={index + 1}
          ticker={stock.ticker}
          name={stock.name}
          logoUrl={stock.logoUrl}
          totalAmount={stock.total_pnl}
        />
      ))}
    </div>
  )
}
